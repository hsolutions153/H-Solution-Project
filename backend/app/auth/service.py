from datetime import datetime, timedelta, timezone
import os
import secrets

from fastapi import HTTPException, status

from app.auth import repository
from app.auth.utils import create_access_token, hash_password, verify_password

CUSTOMER_ROLE_CODE = "CUSTOMER"
OTP_EXPIRE_MINUTES = int(os.getenv("OTP_EXPIRE_MINUTES", "10"))
OTP_EXPOSE_IN_RESPONSE = os.getenv("OTP_EXPOSE_IN_RESPONSE", "false").lower() == "true"
OTP_RESEND_COOLDOWN_SECONDS = 60


def _generate_user_id() -> str:
    """The SQL schema uses VARCHAR(10) user IDs rather than UUIDs."""
    return secrets.token_hex(5).upper()


def authenticate_user(email: str, password: str):
    user = repository.get_user_by_email(email)
    
    if not user or (isinstance(user, list) and len(user) == 0):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if isinstance(user, list):
        user = user[0]

    if not verify_password(password, user.get("password_hash", "")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.get("is_active", True):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User account is locked or inactive")

    role = user.get("role") or {}
    role_id = role.get("id")
    role_code = role.get("code")
    if not role_id or not role_code:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="User role is not configured")

    access_token = create_access_token(
        data={"sub": user["id"], "email": user["email"], "role_id": role_id, "role": role_code}
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role_id": role_id,
        "role": role_code,
        "user": {"id": user["id"], "name": user["full_name"], "phone": user.get("phone")},
    }


def register_customer(data):
    if repository.get_user_by_email(str(data.email)):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")
    if data.phone and repository.get_user_by_phone(data.phone):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Phone already registered")

    customer_role = repository.get_role_by_code(CUSTOMER_ROLE_CODE)
    if not customer_role:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="CUSTOMER role is not configured",
        )
    
    role_id = customer_role[0]["id"] if isinstance(customer_role, list) else customer_role["id"]

    user_data = {
        "id": _generate_user_id(),
        "role_id": role_id,
        "full_name": data.name,
        "phone": data.phone,
        "email": str(data.email),
        "password_hash": hash_password(data.password),
        "address": data.address,
    }
    new_user = repository.create_user(user_data)
    if not new_user:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create user")
    return {"message": "Registered successfully", "user_id": new_user["id"]}


def request_password_reset(phone: str):
    """Create a short-lived OTP without revealing whether the phone exists."""
    user = repository.get_user_by_phone(phone)
    expires_in_seconds = OTP_EXPIRE_MINUTES * 60
    generic_response = {
        "message": "If the phone number is registered, an OTP has been sent.",
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
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS, 
                detail="Please wait before requesting another OTP"
            )

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
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create OTP")

    # Plug an SMS provider in here. The OTP is never returned in normal operation.
    if OTP_EXPOSE_IN_RESPONSE:
        generic_response["otp_code"] = otp_code
    return generic_response


def reset_password(phone: str, otp_code: str, new_password: str):
    user = repository.get_user_by_phone(phone)
    otp = repository.get_valid_otp(phone, datetime.now(timezone.utc).isoformat())
    if not user or not otp or not secrets.compare_digest(otp["otp_code"], otp_code):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired OTP")

    updated = repository.update_user_password(user["id"], hash_password(new_password))
    if not updated:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to reset password")
    repository.mark_otp_used(otp["id"], datetime.now(timezone.utc).isoformat())
    return {"message": "Password reset successfully"}
