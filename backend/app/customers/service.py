import secrets

from fastapi import Depends, HTTPException, status

from app.auth.utils import get_current_user, hash_password
from app.customers import repository
from app.customers.models import ADMIN_ROLE_CODE, CUSTOMER_ROLE_CODE


def _payload(data, *, partial: bool = False):
    if hasattr(data, "model_dump"):
        return data.model_dump(exclude_unset=partial, mode="json")
    return data.dict(exclude_unset=partial)


def _customer_role_id() -> str:
    role = repository.get_role_by_code(CUSTOMER_ROLE_CODE)
    if not role:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="CUSTOMER role is not configured")
    return role["id"]


def require_admin(current_user: dict = Depends(get_current_user)) -> dict:
    """Authorize customer-management APIs against the ADMIN database role ID."""
    admin_role = repository.get_role_by_code(ADMIN_ROLE_CODE)
    if not admin_role:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="ADMIN role is not configured")
    if current_user["role_id"] != admin_role["id"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin permission required")
    return current_user


def require_customer(current_user: dict = Depends(get_current_user)) -> dict:
    """Authorize self-service profile APIs against the CUSTOMER database role ID."""
    if current_user["role_id"] != _customer_role_id():
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Customer permission required")
    return current_user


def _generate_customer_id() -> str:
    return secrets.token_hex(5).upper()


def fetch_customers(search: str | None, page: int, limit: int):
    role_id = _customer_role_id()
    customers, total = repository.get_customers(role_id, search=search, page=page, limit=limit)
    return {"items": customers, "total": total, "page": page, "limit": limit}


def fetch_customer(customer_id: str):
    customer = repository.get_customer_by_id(customer_id, _customer_role_id())
    if not customer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
    return customer


def fetch_own_customer(current_user: dict):
    return fetch_customer(current_user["sub"])


def create_customer(data):
    payload = _payload(data)
    if repository.get_user_by_email(payload["email"]):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")
    if payload.get("phone") and repository.get_user_by_phone(payload["phone"]):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Phone already registered")

    customer_data = {
        "id": _generate_customer_id(),
        "role_id": _customer_role_id(),
        "full_name": payload["full_name"],
        "phone": payload.get("phone"),
        "email": payload["email"],
        "password_hash": hash_password(payload["password"]),
        "address": payload.get("address"),
    }
    customer = repository.create_customer(customer_data)
    if not customer:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create customer")
    return fetch_customer(customer["id"])


def update_customer(customer_id: str, data):
    existing = fetch_customer(customer_id)
    payload = _payload(data, partial=True)
    if not payload:
        return existing
    if "email" in payload:
        duplicate = repository.get_user_by_email(payload["email"])
        if duplicate and duplicate["id"] != customer_id:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")
    if "phone" in payload and payload["phone"]:
        duplicate = repository.get_user_by_phone(payload["phone"])
        if duplicate and duplicate["id"] != customer_id:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Phone already registered")
    repository.update_customer(customer_id, _customer_role_id(), payload)
    return fetch_customer(customer_id)


def update_own_customer(current_user: dict, data):
    return update_customer(current_user["sub"], data)


def update_customer_status(customer_id: str, data):
    fetch_customer(customer_id)
    payload = _payload(data)
    if payload["is_active"]:
        payload["locked_reason"] = None
    repository.update_customer(customer_id, _customer_role_id(), payload)
    return fetch_customer(customer_id)


def delete_customer(customer_id: str):
    fetch_customer(customer_id)
    repository.delete_customer(customer_id, _customer_role_id())
