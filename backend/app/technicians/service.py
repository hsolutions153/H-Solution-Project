import secrets
from datetime import datetime, timezone

from fastapi import Depends

from app.auth import repository as auth_repository
from app.auth.utils import get_current_user
from app.core.exceptions import AppException, ErrorCode
from app.customers.models import ADMIN_ROLE_CODE
from app.db.database import supabase
from app.technicians.models import KYC_STATUSES, SKILLS
from app.technicians.repository import (
    delete_technician_from_db,
    get_all_technicians,
    get_technician_by_id_card_number,
    get_technician_by_user_id,
    insert_technician,
    update_technician_in_db,
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
    payload = _payload(data)
    _validate_profile_values(payload)

    user_id = payload.get("user_id")
    if not user_id:
        user_id = secrets.token_hex(5).upper()
        email = payload.get("email") or f"tech_{user_id.lower()}@h-solution.vn"
        phone = payload.get("phone")
        full_name = payload.get("full_name") or f"Kỹ thuật viên {user_id}"
        password = payload.get("password") or "Abc123456@"

        from app.auth.utils import hash_password

        user_data = {
            "id": user_id,
            "role_id": _role_id(TECHNICIAN_ROLE_CODE),
            "full_name": full_name,
            "phone": phone,
            "email": email,
            "password_hash": hash_password(password),
            "is_active": True,
        }
        supabase.table("users").insert(user_data).execute()
    else:
        user = auth_repository.get_user_by_id(user_id)
        if not user:
            raise AppException(ErrorCode.VALIDATION_ERROR, message="Người dùng không tồn tại")

    id_card_number = payload.get("id_card_number") or f"ID-{user_id}"
    if get_technician_by_id_card_number(id_card_number):
        id_card_number = f"ID-{user_id}-{secrets.token_hex(2).upper()}"

    profile_data = {
        "user_id": user_id,
        "id_card_number": id_card_number,
        "id_card_front": payload.get("id_card_front_url") or "https://placehold.co/400x250/png?text=ID+Front",
        "id_card_back": payload.get("id_card_back_url") or "https://placehold.co/400x250/png?text=ID+Back",
        "certificate_img": payload.get("certificate_url") or "https://placehold.co/400x250/png?text=Certificate",
        "skills": payload.get("skills") or "BOTH",
        "specialization": payload.get("specialization") or "Kỹ thuật viên Sửa chữa H-Solution",
        "experience_years": payload.get("experience_years", 1),
        "kyc_status": "APPROVED",
        "is_online": True,
        "rating_avg": 5.0,
        "total_jobs_done": 0,
        "created_by": "ADMIN",
        "updated_by": "ADMIN",
    }
    insert_technician(profile_data)
    return fetch_technician_by_user_id(user_id)


def update_technician(user_id: str, data):
    existing = fetch_technician_by_user_id(user_id)
    payload = _payload(data, partial=True)
    if not payload:
        return existing
    _validate_profile_values(payload)

    user_update = {}
    if "full_name" in payload and payload["full_name"]:
        user_update["full_name"] = payload.pop("full_name")
    if "phone" in payload and payload["phone"]:
        user_update["phone"] = payload.pop("phone")
    if user_update:
        supabase.table("users").update(user_update).eq("id", user_id).execute()

    if payload:
        update_technician_in_db(user_id, payload)
    return fetch_technician_by_user_id(user_id)


def review_technician_kyc(user_id: str, data, reviewed_by: str):
    fetch_technician_by_user_id(user_id)
    payload = _payload(data)
    if payload["kyc_status"] not in KYC_STATUSES:
        raise AppException(ErrorCode.VALIDATION_ERROR, message="Trạng thái KYC không hợp lệ")
    update_technician_in_db(
        user_id,
        {
            "kyc_status": payload["kyc_status"],
            "kyc_note": payload.get("kyc_note"),
            "kyc_reviewed_by": reviewed_by,
            "kyc_reviewed_at": datetime.now(timezone.utc).isoformat(),
        },
    )
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


def update_my_presence(current_user: dict, data):
    fetch_my_technician(current_user)
    payload = _payload(data)
    if payload.get("last_latitude") is not None or payload.get("last_longitude") is not None:
        payload["last_location_at"] = datetime.now(timezone.utc).isoformat()
    update_technician_in_db(current_user["sub"], payload)
    return fetch_my_technician(current_user)
