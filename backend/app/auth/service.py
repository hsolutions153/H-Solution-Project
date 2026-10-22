from datetime import datetime, timedelta, timezone
import os
import secrets

from app.auth import repository
from app.auth.google import verify_google_id_token
from app.auth.sms import send_password_reset_code
from app.auth.utils import (
    REFRESH_TOKEN_EXPIRE_DAYS,
    create_access_token,
    create_refresh_token,
    get_refresh_token_payload,
    hash_password,
    verify_password,
)
from app.core.exceptions import AppException, ErrorCode

CUSTOMER_ROLE_CODE = "CUSTOMER"
OTP_EXPIRE_MINUTES = int(os.getenv("OTP_EXPIRE_MINUTES", "10"))
OTP_EXPOSE_IN_RESPONSE = os.getenv("OTP_EXPOSE_IN_RESPONSE", "false").lower() == "true"
OTP_RESEND_COOLDOWN_SECONDS = 60


def _generate_user_id() -> str:
    return secrets.token_hex(5).upper()


def _issue_refresh_token(user_id: str, email: str, role_id: str, role: str) -> str:
    raw_token = create_refresh_token(
        {"sub": user_id, "email": email, "role_id": role_id, "role": role}
    )
    created = repository.create_refresh_token(
        {
            "id": _generate_user_id(),
            "user_id": user_id,
            # Cột có tên lịch sử là token_hash; theo luồng JWT này lưu token nguyên vẹn.
            "token_hash": raw_token,
            "expires_at": (datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)).isoformat(),
        }
    )
    if not created:
        raise AppException(ErrorCode.INTERNAL_SERVER_ERROR)
    return raw_token


def refresh_access_token(raw_refresh_token: str):
    payload = get_refresh_token_payload(raw_refresh_token)
    now = datetime.now(timezone.utc)
    stored = repository.get_refresh_token_by_hash(raw_refresh_token)
    if not stored:
        raise AppException(ErrorCode.TOKEN_INVALID, headers={"WWW-Authenticate": "Bearer"})
    if stored["user_id"] != payload["sub"]:
        raise AppException(ErrorCode.TOKEN_INVALID, headers={"WWW-Authenticate": "Bearer"})

    if stored.get("revoked_at"):
        # Token cũ bị dùng lại: thu hồi toàn bộ phiên của user
        repository.revoke_all_user_refresh_tokens(stored["user_id"], now.isoformat())
        raise AppException(ErrorCode.TOKEN_INVALID, headers={"WWW-Authenticate": "Bearer"})

    expires_at = datetime.fromisoformat(str(stored["expires_at"]).replace("Z", "+00:00"))
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at <= now:
        raise AppException(ErrorCode.TOKEN_EXPIRED, headers={"WWW-Authenticate": "Bearer"})

    user = repository.get_user_by_id(stored["user_id"])
    if isinstance(user, list):
        user = user[0] if user else None
    if not user or not user.get("is_active", True):
        raise AppException(ErrorCode.USER_LOCKED)

    role = user.get("role") or {}
    if not role.get("id") or not role.get("code"):
        raise AppException(ErrorCode.ROLE_NOT_CONFIGURED)

    # Xoay vòng: thu hồi token cũ, cấp token mới
    repository.revoke_refresh_token(stored["id"], now.isoformat())
    access_token = create_access_token(
        data={"sub": user["id"], "email": user["email"], "role_id": role["id"], "role": role["code"]}
    )
    return {
        "access_token": access_token,
        "refresh_token": _issue_refresh_token(user["id"], user["email"], role["id"], role["code"]),
        "token_type": "bearer",
    }


def logout_refresh_token(raw_refresh_token: str):
    try:
        get_refresh_token_payload(raw_refresh_token)
    except AppException:
        return {"message": "Đăng xuất thành công"}

    stored = repository.get_refresh_token_by_hash(raw_refresh_token)
    if stored and not stored.get("revoked_at"):
        repository.revoke_refresh_token(stored["id"], datetime.now(timezone.utc).isoformat())
    return {"message": "Đăng xuất thành công"}


def authenticate_user(email_or_phone: str, password: str):
    input_val = email_or_phone.strip()
    user = repository.get_user_by_email(input_val.lower())
    if not user:
        user_by_phone = repository.get_user_by_phone(input_val)
        if user_by_phone:
            user = repository.get_user_by_id(user_by_phone["id"])
    
    if not user or (isinstance(user, list) and len(user) == 0):
        raise AppException(ErrorCode.INVALID_CREDENTIALS, headers={"WWW-Authenticate": "Bearer"})
    
    if isinstance(user, list):
        user = user[0]

    if not verify_password(password, user.get("password_hash", "")):
        raise AppException(ErrorCode.INVALID_CREDENTIALS, headers={"WWW-Authenticate": "Bearer"})

    if not user.get("is_active", True):
        raise AppException(ErrorCode.USER_LOCKED)


    role = user.get("role") or {}
    role_id = role.get("id")
    role_code = role.get("code")
    if not role_id or not role_code:
        raise AppException(ErrorCode.ROLE_NOT_CONFIGURED)

    access_token = create_access_token(
        data={"sub": user["id"], "email": user["email"], "role_id": role_id, "role": role_code}
    )
    user_addr = (user.get("address") or "").strip()
    user_phone = (user.get("phone") or "").strip()
    is_profile_complete = bool(user_addr and user_addr != "Chưa cập nhật" and user_phone)

    return {
        "access_token": access_token,
        "refresh_token": _issue_refresh_token(user["id"], user["email"], role_id, role_code),
        "token_type": "bearer",
        "role_id": role_id,
        "role": role_code,
        "is_new_user": False,
        "is_profile_complete": is_profile_complete,
        "user": {
            "id": user["id"],
            "name": user["full_name"],
            "phone": user.get("phone"),
            "email": user.get("email"),
            "address": user_addr if user_addr != "Chưa cập nhật" else None,
            "is_new_user": False,
            "is_profile_complete": is_profile_complete,
        },
    }


def register_customer(data):
    normalized_email = str(data.email).strip().lower()
    normalized_phone = data.phone.strip() if data.phone and data.phone.strip() else None
    normalized_address = data.address.strip() if data.address and data.address.strip() else None

    if not normalized_phone:
        raise AppException(ErrorCode.VALIDATION_ERROR, message="Số điện thoại là bắt buộc để đăng ký tài khoản")

    if repository.get_user_by_email(normalized_email):
        raise AppException(ErrorCode.EMAIL_ALREADY_EXISTS)
    if repository.get_user_by_phone(normalized_phone):
        raise AppException(ErrorCode.PHONE_ALREADY_EXISTS)

    now_iso = datetime.now(timezone.utc).isoformat()
    otp = repository.get_valid_otp(normalized_phone, now_iso)
    if not otp or not secrets.compare_digest(otp["otp_code"], data.otp_code.strip()):
        raise AppException(ErrorCode.OTP_INVALID, message="Mã OTP không chính xác hoặc đã hết hạn")

    customer_role = repository.get_role_by_code(CUSTOMER_ROLE_CODE)
    if not customer_role:
        raise AppException(ErrorCode.ROLE_NOT_CONFIGURED)
    
    role_id = customer_role[0]["id"] if isinstance(customer_role, list) else customer_role["id"]

    user_data = {
        "id": _generate_user_id(),
        "role_id": role_id,
        "full_name": data.name.strip(),
        "phone": normalized_phone,
        "email": normalized_email,
        "password_hash": hash_password(data.password),
        "address": normalized_address,
    }
    new_user = repository.create_user(user_data)
    if not new_user:
        raise AppException(ErrorCode.INTERNAL_SERVER_ERROR)

    repository.mark_otp_used(otp["id"], now_iso)
    return {"message": "Đăng ký tài khoản thành công", "user_id": new_user["id"]}


def request_registration_otp(phone: str, email: str | None = None):
    normalized_phone = phone.strip()
    if repository.get_user_by_phone(normalized_phone):
        raise AppException(ErrorCode.PHONE_ALREADY_EXISTS)
    if email:
        normalized_email = email.strip().lower()
        if repository.get_user_by_email(normalized_email):
            raise AppException(ErrorCode.EMAIL_ALREADY_EXISTS)

    now = datetime.now(timezone.utc)
    latest = repository.get_latest_otp(normalized_phone)
    if isinstance(latest, list) and len(latest) > 0:
        latest = latest[0]
    if latest and latest.get("created_at"):
        raw_created_at = str(latest["created_at"])
        if "T" not in raw_created_at and " " in raw_created_at:
            raw_created_at = raw_created_at.replace(" ", "T", 1)
        raw_created_at = raw_created_at.replace("Z", "").replace("z", "")
        created_at = datetime.fromisoformat(raw_created_at)
        if created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=timezone.utc)
        if (now - created_at).total_seconds() < OTP_RESEND_COOLDOWN_SECONDS:
            raise AppException(ErrorCode.VALIDATION_ERROR, message="Vui lòng chờ ít phút trước khi yêu cầu mã OTP mới")

    otp_code = f"{secrets.randbelow(1_000_000):06d}"
    repository.invalidate_unused_otps(normalized_phone, now.isoformat())
    created = repository.create_otp(
        {
            "id": _generate_user_id(),
            "phone": normalized_phone,
            "otp_code": otp_code,
            "expires_at": (now + timedelta(minutes=OTP_EXPIRE_MINUTES)).isoformat(),
        }
    )
    if not created:
        raise AppException(ErrorCode.INTERNAL_SERVER_ERROR)

    try:
        send_password_reset_code(normalized_phone, otp_code)
    except AppException:
        repository.mark_otp_used(created["id"], now.isoformat())
        raise

    expires_in_seconds = OTP_EXPIRE_MINUTES * 60
    response = {
        "message": f"Mã OTP đã được gửi đến số điện thoại {normalized_phone}",
        "expires_in_seconds": expires_in_seconds,
    }
    if OTP_EXPOSE_IN_RESPONSE and os.getenv("APP_ENV", "development").lower() != "production":
        response["otp_code"] = otp_code
    return response


def verify_registration_otp(phone: str, otp_code: str):
    normalized_phone = phone.strip()
    otp = repository.get_valid_otp(normalized_phone, datetime.now(timezone.utc).isoformat())
    if not otp or not secrets.compare_digest(otp["otp_code"], otp_code.strip()):
        raise AppException(ErrorCode.OTP_INVALID)
    return otp


def authenticate_or_register_google_user(payload):
    claims = verify_google_id_token(payload.id_token)
    email = str(claims["email"]).strip().lower()
    name = str(claims.get("name") or "").strip() or "Khách hàng Google"

    user = repository.get_user_by_email(email)
    if isinstance(user, list) and len(user) > 0:
        user = user[0]
    elif isinstance(user, list):
        user = None

    customer_role = repository.get_role_by_code(CUSTOMER_ROLE_CODE)
    if not customer_role:
        raise AppException(ErrorCode.ROLE_NOT_CONFIGURED)
    role_id = customer_role[0]["id"] if isinstance(customer_role, list) else customer_role["id"]

    is_new = False
    if not user:
        is_new = True
        user_id = _generate_user_id()
        import random
        placeholder_phone = f"09{random.randint(10000000, 99999999)}"
        while repository.get_user_by_phone(placeholder_phone):
            placeholder_phone = f"09{random.randint(10000000, 99999999)}"

        user_data = {
            "id": user_id,
            "role_id": role_id,
            "full_name": name,
            "email": email,
            "phone": placeholder_phone,
            "password_hash": hash_password(secrets.token_urlsafe(32)),
            "address": "Chưa cập nhật",
            "is_active": True,
        }
        user = repository.create_user(user_data)
        if not user:
            raise AppException(ErrorCode.INTERNAL_SERVER_ERROR)

    else:
        if not user.get("is_active", True):
            raise AppException(ErrorCode.USER_LOCKED)

    role = user.get("role") or {}
    user_role_id = role.get("id") or user.get("role_id") or role_id
    user_role_code = role.get("code") or CUSTOMER_ROLE_CODE

    user_addr = (user.get("address") or "").strip()
    user_phone = (user.get("phone") or "").strip()
    is_profile_complete = (
        not is_new
        and bool(user_addr and user_addr != "Chưa cập nhật" and user_phone)
    )
    is_new_user = is_new or (not is_profile_complete)

    access_token = create_access_token(
        data={"sub": user["id"], "email": user["email"], "role_id": user_role_id, "role": user_role_code}
    )
    return {
        "access_token": access_token,
        "refresh_token": _issue_refresh_token(user["id"], user["email"], user_role_id, user_role_code),
        "token_type": "bearer",
        "role_id": user_role_id,
        "role": user_role_code,
        "is_new_user": is_new_user,
        "is_profile_complete": is_profile_complete,
        "user": {
            "id": user["id"],
            "name": user.get("full_name") or name,
            "phone": user.get("phone") if is_profile_complete else "",
            "email": user["email"],
            "address": user_addr if user_addr != "Chưa cập nhật" else "",
            "is_new_user": is_new_user,
            "is_profile_complete": is_profile_complete,
        },
    }



def request_password_reset(phone: str):
    user = repository.get_user_by_phone(phone)
    expires_in_seconds = OTP_EXPIRE_MINUTES * 60
    generic_response = {
        "message": "Mã OTP đã được gửi đến số điện thoại của bạn nếu tồn tại trong hệ thống",
        "expires_in_seconds": expires_in_seconds,
    }
    if not user:
        return generic_response

    now = datetime.now(timezone.utc)
    latest = repository.get_latest_otp(phone)
    if isinstance(latest, list) and len(latest) > 0:
        latest = latest[0]
    if latest and latest.get("created_at"):
        raw_created_at = str(latest["created_at"])
        
        if "T" not in raw_created_at and " " in raw_created_at:
            raw_created_at = raw_created_at.replace(" ", "T", 1)
        
        raw_created_at = raw_created_at.replace("Z", "").replace("z", "")
        created_at = datetime.fromisoformat(raw_created_at)
        
        if created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=timezone.utc)
        if (now - created_at).total_seconds() < OTP_RESEND_COOLDOWN_SECONDS:
            raise AppException(ErrorCode.VALIDATION_ERROR, message="Vui lòng chờ ít phút trước khi yêu cầu mã OTP mới")

    otp_code = f"{secrets.randbelow(1_000_000):06d}"
    repository.invalidate_unused_otps(phone, now.isoformat())
    created = repository.create_otp(
        {
            "id": _generate_user_id(),
            "phone": phone,
            "otp_code": otp_code,
            "expires_at": (now + timedelta(minutes=OTP_EXPIRE_MINUTES)).isoformat(),
        }
    )
    if not created:
        raise AppException(ErrorCode.INTERNAL_SERVER_ERROR)

    try:
        send_password_reset_code(phone, otp_code)
    except AppException:
        repository.mark_otp_used(created["id"], now.isoformat())
        raise

    if OTP_EXPOSE_IN_RESPONSE and os.getenv("APP_ENV", "development").lower() != "production":
        generic_response["otp_code"] = otp_code
    return generic_response


def verify_password_reset_code(phone: str, otp_code: str):
    user = repository.get_user_by_phone(phone)
    otp = repository.get_valid_otp(phone, datetime.now(timezone.utc).isoformat())
    if not user or not otp or not secrets.compare_digest(otp["otp_code"], otp_code):
        raise AppException(ErrorCode.OTP_INVALID)
    return user, otp


def reset_password(phone: str, otp_code: str, new_password: str):
    user, otp = verify_password_reset_code(phone, otp_code)
    updated = repository.update_user_password(user["id"], hash_password(new_password))
    if not updated:
        raise AppException(ErrorCode.INTERNAL_SERVER_ERROR)
    repository.mark_otp_used(otp["id"], datetime.now(timezone.utc).isoformat())
    return {"message": "Đặt lại mật khẩu thành công"}
