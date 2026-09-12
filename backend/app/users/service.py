import secrets

from fastapi import Depends

from app.auth.utils import get_current_user, hash_password
from app.core.exceptions import AppException, ErrorCode
from app.customers.models import ADMIN_ROLE_CODE
from app.users import repository


def _payload(data, *, partial: bool = False):
    if hasattr(data, "model_dump"):
        return data.model_dump(exclude_unset=partial, mode="json")
    return data.dict(exclude_unset=partial)


def _generate_user_id() -> str:
    return secrets.token_hex(5).upper()


def _admin_role_id() -> str:
    role = repository.get_role_by_code(ADMIN_ROLE_CODE)
    if not role:
        raise AppException(ErrorCode.ROLE_NOT_CONFIGURED)
    return role["id"]


def require_admin(current_user: dict = Depends(get_current_user)) -> dict:
    if current_user["role_id"] != _admin_role_id():
        raise AppException(ErrorCode.FORBIDDEN)
    return current_user


def fetch_roles():
    return {"items": repository.get_roles()}


def fetch_users(search: str | None, role_id: str | None, is_active: bool | None, page: int, limit: int):
    if role_id and not repository.get_role_by_id(role_id):
        raise AppException(ErrorCode.ROLE_NOT_CONFIGURED)
    users, total = repository.get_users(
        search=search,
        role_id=role_id,
        is_active=is_active,
        page=page,
        limit=limit,
    )
    return {"items": users, "total": total, "page": page, "limit": limit}


def fetch_user(user_id: str):
    user = repository.get_user_by_id(user_id)
    if not user:
        raise AppException(ErrorCode.USER_NOT_FOUND)
    return user


def create_user(data):
    payload = _payload(data)
    if not repository.get_role_by_id(payload["role_id"]):
        raise AppException(ErrorCode.ROLE_NOT_CONFIGURED)
    if repository.get_user_by_email(payload["email"]):
        raise AppException(ErrorCode.EMAIL_ALREADY_EXISTS)
    if payload.get("phone") and repository.get_user_by_phone(payload["phone"]):
        raise AppException(ErrorCode.PHONE_ALREADY_EXISTS)

    user_payload = {
        "id": _generate_user_id(),
        "role_id": payload["role_id"],
        "full_name": payload["full_name"],
        "phone": payload.get("phone") or "",
        "email": payload["email"],
        "password_hash": hash_password(payload["password"]),
        "address": payload.get("address"),
        "is_active": payload.get("is_active", True),
        "locked_reason": None if payload.get("is_active", True) else payload.get("locked_reason"),
    }
    created = repository.create_user(user_payload)
    if not created:
        raise AppException(ErrorCode.INTERNAL_SERVER_ERROR)
    return fetch_user(created["id"])


def update_user(user_id: str, current_user: dict, data):
    existing = fetch_user(user_id)
    payload = _payload(data, partial=True)
    if not payload:
        return existing

    if "role_id" in payload and payload["role_id"] and not repository.get_role_by_id(payload["role_id"]):
        raise AppException(ErrorCode.ROLE_NOT_CONFIGURED)
    if "email" in payload:
        duplicate = repository.get_user_by_email(payload["email"])
        if duplicate and duplicate["id"] != user_id:
            raise AppException(ErrorCode.EMAIL_ALREADY_EXISTS)
    if "phone" in payload and payload["phone"]:
        duplicate = repository.get_user_by_phone(payload["phone"])
        if duplicate and duplicate["id"] != user_id:
            raise AppException(ErrorCode.PHONE_ALREADY_EXISTS)
    if user_id == current_user["sub"]:
        if payload.get("is_active") is False:
            raise AppException(ErrorCode.VALIDATION_ERROR, message="Khong the khoa tai khoan dang dang nhap")
        if payload.get("role_id") and payload["role_id"] != existing["role_id"]:
            raise AppException(ErrorCode.VALIDATION_ERROR, message="Khong the doi vai tro tai khoan dang dang nhap")

    update_payload = {
        key: value
        for key, value in payload.items()
        if key in {"full_name", "phone", "email", "role_id", "address", "is_active", "locked_reason"}
    }
    if "password" in payload and payload["password"]:
        update_payload["password_hash"] = hash_password(payload["password"])
    if update_payload.get("is_active") is True:
        update_payload["locked_reason"] = None
    if "phone" in update_payload and update_payload["phone"] is None:
        update_payload["phone"] = ""

    repository.update_user(user_id, update_payload)
    return fetch_user(user_id)


def update_user_status(user_id: str, current_user: dict, data):
    return update_user(user_id, current_user, data)


def delete_user(user_id: str, current_user: dict):
    fetch_user(user_id)
    if user_id == current_user["sub"]:
        raise AppException(ErrorCode.VALIDATION_ERROR, message="Khong the xoa tai khoan dang dang nhap")
    repository.delete_user(user_id)
