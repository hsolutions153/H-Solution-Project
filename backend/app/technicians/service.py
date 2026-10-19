import secrets
from datetime import datetime, timezone

from fastapi import Depends, UploadFile

from app.auth import repository as auth_repository
from app.auth.utils import get_current_user
from app.core import storage
from app.core.exceptions import AppException, ErrorCode
from app.core.validation import validated_payload
from app.technicians.schemas import TechnicianCreate, TechnicianUpdate, TechnicianSelfUpdate, TechnicianPresenceUpdate
from app.customers.models import ADMIN_ROLE_CODE
from app.db.database import supabase
from app.technicians.models import KYC_STATUSES, SKILLS
from app.technicians.repository import (
    delete_bank_account,
    delete_technician_from_db,
    get_all_technicians,
    get_bank_account,
    get_technician_by_id_card_number,
    get_technician_by_user_id,
    insert_technician,
    update_technician_in_db,
    upsert_bank_account,
)

TECHNICIAN_ROLE_CODE = "TECHNICIAN"


def _payload(data, *, partial: bool = False):
    if isinstance(data, dict):
        return data
    if hasattr(data, "model_dump"):
        return data.model_dump(exclude_unset=partial, mode="json")
    if hasattr(data, "dict"):
        return data.dict(exclude_unset=partial)
    return dict(data)


def _validate_profile_values(data: dict):
    if "skills" in data and data["skills"] not in SKILLS:
        raise AppException(ErrorCode.VALIDATION_ERROR, message="Kỹ năng của kỹ thuật viên không hợp lệ")


def _role_id(code: str) -> str:
    role = auth_repository.get_role_by_code(code)
    if not role:
        raise AppException(ErrorCode.ROLE_NOT_CONFIGURED)
    return role["id"]


def require_admin(current_user: dict = Depends(get_current_user)) -> dict:
    if current_user["role_id"] != _role_id(ADMIN_ROLE_CODE):
        raise AppException(ErrorCode.FORBIDDEN)
    return current_user


def require_technician(current_user: dict = Depends(get_current_user)) -> dict:
    if current_user["role_id"] != _role_id(TECHNICIAN_ROLE_CODE):
        raise AppException(ErrorCode.FORBIDDEN)
    return current_user


def fetch_all_technicians(kyc_status: str | None = None):
    if kyc_status and kyc_status not in KYC_STATUSES:
        raise AppException(ErrorCode.VALIDATION_ERROR, message="Trạng thái KYC không hợp lệ")
    return get_all_technicians(kyc_status)


def fetch_technician_by_user_id(user_id: str):
    technician = get_technician_by_user_id(user_id)
    if not technician:
        raise AppException(ErrorCode.TECHNICIAN_NOT_FOUND)
    return technician


def create_technician(data):
    payload = validated_payload(TechnicianCreate, data)
    _validate_profile_values(payload)

    user_id = payload.get("user_id") or secrets.token_hex(5).upper()
    # Keep an explicit internal placeholder when CCCD was not supplied.
    id_card_number = payload.get("id_card_number") or f"ID-{user_id[:9]}"
    if get_technician_by_id_card_number(id_card_number):
        raise AppException(ErrorCode.VALIDATION_ERROR, message="Số căn cước đã được sử dụng")

    if not payload.get("user_id"):
        # Tạo user mới cho KTV
        email = payload.get("email") or f"tech_{user_id.lower()}@h-solution.vn"
        full_name = payload.get("full_name") or f"Kỹ thuật viên {user_id}"
        password = payload["password"]
        if auth_repository.get_user_by_email(email):
            raise AppException(ErrorCode.EMAIL_ALREADY_EXISTS)
        if payload.get("phone") and auth_repository.get_user_by_phone(payload["phone"]):
            raise AppException(ErrorCode.PHONE_ALREADY_EXISTS)

        from app.auth.utils import hash_password
        supabase.table("users").insert({
            "id": user_id,
            "role_id": _role_id(TECHNICIAN_ROLE_CODE),
            "full_name": full_name,
            "phone": payload.get("phone"),
            "email": email,
            "password_hash": hash_password(password),
            "is_active": True,
        }).execute()
    else:
        user = auth_repository.get_user_by_id(user_id)
        if not user:
            raise AppException(ErrorCode.VALIDATION_ERROR, message="Người dùng không tồn tại")
        if user.get("role_id") != _role_id(TECHNICIAN_ROLE_CODE):
            raise AppException(ErrorCode.VALIDATION_ERROR, message="Người dùng phải có vai trò kỹ thuật viên")

    insert_technician({
        "user_id": user_id,
        "id_card_number": id_card_number,
        "id_card_front": payload.get("id_card_front_url") or "https://placehold.co/400x250/png?text=ID+Front",
        "id_card_back": payload.get("id_card_back_url") or "https://placehold.co/400x250/png?text=ID+Back",
        "certificate_img": payload.get("certificate_url") or "https://placehold.co/400x250/png?text=Certificate",
        "skills": payload.get("skills") or "BOTH",
        "specialization": payload.get("specialization") or "Kỹ thuật viên Sửa chữa H-Solution",
        "experience_years": payload.get("experience_years", 1),
        "kyc_status": "APPROVED",
        "is_online": False,
        "rating_avg": 5.0,
        "total_jobs_done": 0,
        "created_by": "ADMIN",
        "updated_by": "ADMIN",
    })
    return fetch_technician_by_user_id(user_id)


def update_technician(user_id: str, data):
    existing = fetch_technician_by_user_id(user_id)
    schema = TechnicianSelfUpdate if isinstance(data, TechnicianSelfUpdate) else TechnicianUpdate
    payload = validated_payload(schema, data, partial=True)
    if not payload:
        return existing
    _validate_profile_values(payload)

    # Tách full_name / phone sang bảng users
    if {"is_online", "last_latitude", "last_longitude"} & payload.keys():
        validated_payload(TechnicianPresenceUpdate, {
            "is_online": payload.get("is_online", existing.get("is_online", False)),
            "last_latitude": payload.get("last_latitude", existing.get("last_latitude")),
            "last_longitude": payload.get("last_longitude", existing.get("last_longitude")),
        })
        if payload.get("last_latitude") is not None:
            payload["last_location_at"] = datetime.now(timezone.utc).isoformat()
    user_update = {}
    if "full_name" in payload and payload["full_name"] is not None:
        user_update["full_name"] = payload.pop("full_name")
    if payload.get("phone"):
        duplicate = auth_repository.get_user_by_phone(payload["phone"])
        if duplicate and duplicate["id"] != user_id:
            raise AppException(ErrorCode.PHONE_ALREADY_EXISTS)
    if "phone" in payload:
        user_update["phone"] = payload.pop("phone")
    if user_update:
        supabase.table("users").update(user_update).eq("id", user_id).execute()

    # Tách STK sang bảng technician_bank_accounts
    bank_supplied = "bank_account" in payload
    bank_data = payload.pop("bank_account", None)
    flat_code = payload.pop("bank_code", None)
    flat_name = payload.pop("bank_name", None)
    flat_num = payload.pop("account_number", None)
    flat_holder = payload.pop("account_holder", None)

    if flat_num is not None or flat_code is not None or flat_name is not None or flat_holder is not None:
        bank_supplied = True
        if flat_num and str(flat_num).strip():
            bank_data = {
                "bank_code": flat_code,
                "bank_name": flat_name,
                "account_number": str(flat_num).strip(),
                "account_holder": (flat_holder or "").strip(),
            }
        else:
            bank_data = None

    if bank_supplied:
        if isinstance(bank_data, dict) and bank_data.get("account_number"):
            upsert_bank_account(user_id, bank_data)
        else:
            delete_bank_account(user_id)

    if payload:
        for api_name, column in (("id_card_front_url", "id_card_front"),
                                 ("id_card_back_url", "id_card_back"),
                                 ("certificate_url", "certificate_img")):
            if api_name in payload:
                payload[column] = payload.pop(api_name)
        update_technician_in_db(user_id, payload)
    return fetch_technician_by_user_id(user_id)


def review_technician_kyc(user_id: str, data, reviewed_by: str):
    fetch_technician_by_user_id(user_id)
    payload = _payload(data)
    if payload["kyc_status"] not in KYC_STATUSES:
        raise AppException(ErrorCode.VALIDATION_ERROR, message="Trạng thái KYC không hợp lệ")
    update_technician_in_db(user_id, {
        "kyc_status": payload["kyc_status"],
        "kyc_note": payload.get("kyc_note"),
        "kyc_reviewed_by": reviewed_by,
        "kyc_reviewed_at": datetime.now(timezone.utc).isoformat(),
    })
    return fetch_technician_by_user_id(user_id)


def delete_technician(user_id: str):
    fetch_technician_by_user_id(user_id)
    delete_technician_from_db(user_id)
    try:
        supabase.table("users").delete().eq("id", user_id).execute()
    except Exception:
        pass


def fetch_my_technician(current_user: dict):
    return fetch_technician_by_user_id(current_user["sub"])


def upsert_my_bank_account(current_user: dict, data):
    tech_id = current_user["sub"]
    fetch_my_technician(current_user)

    from app.technicians.schemas import BankAccountUpsert
    payload = data.model_dump() if isinstance(data, BankAccountUpsert) else dict(data)

    result = upsert_bank_account(tech_id, payload)
    if not result:
        raise AppException(ErrorCode.DATABASE_ERROR)
    return result


def delete_my_bank_account(current_user: dict):
    tech_id = current_user["sub"]
    fetch_my_technician(current_user)
    if not get_bank_account(tech_id):
        raise AppException(ErrorCode.VALIDATION_ERROR, message="Chưa có tài khoản ngân hàng để xóa.")
    delete_bank_account(tech_id)
    return {"success": True, "message": "Đã xóa tài khoản ngân hàng."}


def upload_my_avatar(current_user: dict, file: UploadFile):
    fetch_my_technician(current_user)
    avatar_url = storage.upload_avatar(file, current_user["sub"])
    supabase.table("users").update({"avatar_url": avatar_url}).eq("id", current_user["sub"]).execute()

    # Xóa cache KTV trong repair_requests
    from app.repair_requests.service import invalidate_technician_cache
    invalidate_technician_cache(current_user["sub"])
    return fetch_my_technician(current_user)


def update_my_presence(current_user: dict, data):
    fetch_my_technician(current_user)
    payload = validated_payload(TechnicianPresenceUpdate, data)
    latitude = payload.get("last_latitude")
    longitude = payload.get("last_longitude")

    if payload.get("is_online"):
        if latitude is None or longitude is None:
            raise AppException(
                ErrorCode.VALIDATION_ERROR,
                message="Bật vị trí GPS để nhận việc mới.",
            )

    if (latitude is None) != (longitude is None):
        raise AppException(
            ErrorCode.VALIDATION_ERROR,
            message="Vị trí GPS phải có đủ cả vĩ độ và kinh độ.",
        )

    if latitude is not None and longitude is not None:
        try:
            valid_coordinates = -90 <= float(latitude) <= 90 and -180 <= float(longitude) <= 180
        except (TypeError, ValueError):
            valid_coordinates = False
        if not valid_coordinates:
            raise AppException(ErrorCode.VALIDATION_ERROR, message="Tọa độ GPS không hợp lệ.")
        payload["last_location_at"] = datetime.now(timezone.utc).isoformat()
    update_technician_in_db(current_user["sub"], payload)
    from app.repair_requests.service import invalidate_technician_cache
    invalidate_technician_cache(current_user["sub"])
    return fetch_my_technician(current_user)
