from datetime import datetime, timezone

from fastapi import Depends

from app.auth import repository as auth_repository
from app.auth.utils import get_current_user
from app.core.exceptions import AppException, ErrorCode
from app.customers.models import ADMIN_ROLE_CODE
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
    if hasattr(data, "model_dump"):
        return data.model_dump(exclude_unset=partial, mode="json")
    return data.dict(exclude_unset=partial)


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
    user = auth_repository.get_user_by_id(payload["user_id"])
    if not user or (user.get("role") or {}).get("code") != TECHNICIAN_ROLE_CODE:
        raise AppException(ErrorCode.VALIDATION_ERROR, message="Người dùng phải có vai trò TECHNICIAN")
    if get_technician_by_user_id(payload["user_id"]):
        raise AppException(ErrorCode.VALIDATION_ERROR, message="Hồ sơ kỹ thuật viên đã tồn tại")
    if get_technician_by_id_card_number(payload["id_card_number"]):
        raise AppException(ErrorCode.VALIDATION_ERROR, message="Số CCCD đã tồn tại trong hệ thống")
    insert_technician(payload)
    return fetch_technician_by_user_id(payload["user_id"])


def update_technician(user_id: str, data):
    existing = fetch_technician_by_user_id(user_id)
    payload = _payload(data, partial=True)
    if not payload:
        return existing
    _validate_profile_values(payload)
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


def fetch_my_technician(current_user: dict):
    return fetch_technician_by_user_id(current_user["sub"])


def update_my_presence(current_user: dict, data):
    fetch_my_technician(current_user)
    payload = _payload(data)
    if payload.get("last_latitude") is not None or payload.get("last_longitude") is not None:
        payload["last_location_at"] = datetime.now(timezone.utc).isoformat()
    update_technician_in_db(current_user["sub"], payload)
    return fetch_my_technician(current_user)
