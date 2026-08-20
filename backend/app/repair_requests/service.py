from datetime import datetime, timezone
import json
import secrets

from fastapi import HTTPException, status

from app.auth import repository as auth_repository
from app.customers.models import ADMIN_ROLE_CODE, CUSTOMER_ROLE_CODE
from app.repair_requests import repository
from app.repair_requests.models import (
    ISSUE_TYPES,
    REQUEST_STATUSES,
    TECHNICIAN_ROLE_CODE,
    TECHNICIAN_TRANSITIONS,
)


def _payload(data):
    if hasattr(data, "model_dump"):
        return data.model_dump(mode="json")
    return data.dict()


def _role_id(code: str) -> str:
    role = auth_repository.get_role_by_code(code)
    if not role:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"{code} role is not configured")
    return role["id"]


def _is_role(current_user: dict, code: str) -> bool:
    return current_user["role_id"] == _role_id(code)


def _request_id() -> str:
    return secrets.token_hex(5).upper()


def _serialize_images(request: dict) -> dict:
    result = request.copy()
    for field in ("inspection_images", "after_repair_images"):
        value = result.get(field)
        if isinstance(value, str):
            try:
                result[field] = json.loads(value)
            except json.JSONDecodeError:
                result[field] = [value]
    return result


def _attach_payment_info(requests: list[dict]) -> list[dict]:
    payments = repository.get_payments_for_repairs([request["id"] for request in requests])
    result = []
    for request in requests:
        item = request.copy()
        payment = payments.get(item["id"]) or {}
        item["payment_method"] = payment.get("payment_method")
        item["payment_status"] = payment.get("payment_status", "UNPAID")
        result.append(item)
    return result


def _list(customer_id: str | None, technician_id: str | None, request_status: str | None, page: int, limit: int):
    if request_status and request_status not in REQUEST_STATUSES:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid request status")
    items, total = repository.get_repair_requests(
        customer_id=customer_id,
        technician_id=technician_id,
        request_status=request_status,
        page=page,
        limit=limit,
    )
    return {
        "items": [_serialize_images(item) for item in _attach_payment_info(items)],
        "total": total,
        "page": page,
        "limit": limit,
    }


def create_request(current_user: dict, data):
    if not _is_role(current_user, CUSTOMER_ROLE_CODE):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Customer permission required")
    payload = _payload(data)
    if payload["issue_type"] not in ISSUE_TYPES:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid issue type")
    if not repository.get_device_for_customer(payload["device_id"], current_user["sub"]):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found")

    request_id = _request_id()
    record = {
        "id": request_id,
        "request_code": _request_id(),
        "customer_id": current_user["sub"],
        "device_id": payload["device_id"],
        "issue_type": payload["issue_type"],
        "issue_description": payload["issue_description"],
        "location_address": payload["location_address"],
        "latitude": payload.get("latitude"),
        "longitude": payload.get("longitude"),
        "is_sos": payload["is_sos"],
        "inspection_images": json.dumps(payload["inspection_images"]) if payload.get("inspection_images") else None,
        "status": "PENDING",
    }
    created = repository.create_repair_request(record)
    if not created:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create repair request")
    return fetch_request(request_id, current_user)


def fetch_my_requests(current_user: dict, request_status: str | None, page: int, limit: int):
    if not _is_role(current_user, CUSTOMER_ROLE_CODE):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Customer permission required")
    return _list(current_user["sub"], None, request_status, page, limit)


def fetch_technician_requests(current_user: dict, request_status: str | None, page: int, limit: int):
    if not _is_role(current_user, TECHNICIAN_ROLE_CODE):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Technician permission required")
    return _list(None, current_user["sub"], request_status, page, limit)


def fetch_all_requests(current_user: dict, request_status: str | None, customer_id: str | None, technician_id: str | None, page: int, limit: int):
    if not _is_role(current_user, ADMIN_ROLE_CODE):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin permission required")
    return _list(customer_id, technician_id, request_status, page, limit)


def fetch_request(request_id: str, current_user: dict):
    request = repository.get_repair_request_by_id(request_id)
    if not request:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Repair request not found")
    can_view = (
        _is_role(current_user, ADMIN_ROLE_CODE)
        or (_is_role(current_user, CUSTOMER_ROLE_CODE) and request["customer_id"] == current_user["sub"])
        or (_is_role(current_user, TECHNICIAN_ROLE_CODE) and request.get("technician_id") == current_user["sub"])
    )
    if not can_view:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
    return _serialize_images(_attach_payment_info([request])[0])


def update_request_status(request_id: str, current_user: dict, data):
    request = repository.get_repair_request_by_id(request_id)
    if not request:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Repair request not found")
    payload = _payload(data)
    new_status = payload["status"]
    if new_status not in REQUEST_STATUSES:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid request status")

    is_admin = _is_role(current_user, ADMIN_ROLE_CODE)
    is_customer = _is_role(current_user, CUSTOMER_ROLE_CODE) and request["customer_id"] == current_user["sub"]
    is_technician = _is_role(current_user, TECHNICIAN_ROLE_CODE) and request.get("technician_id") == current_user["sub"]

    if is_admin:
        allowed = new_status == "CANCELLED" and request["status"] not in {"COMPLETED", "CANCELLED"}
    elif is_customer:
        allowed = request["status"] == "PENDING" and new_status == "CANCELLED"
    elif is_technician:
        allowed = new_status in TECHNICIAN_TRANSITIONS.get(request["status"], set())
        if new_status == "REPAIRING" and allowed and not repository.has_accepted_quote(request_id):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="An accepted quote is required before repairing")
    else:
        allowed = False

    if not allowed:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid status transition")

    now = datetime.now(timezone.utc).isoformat()
    update_data = {"status": new_status, "updated_by": current_user["sub"]}
    if new_status == "ACCEPTED":
        update_data["accepted_at"] = now
    elif new_status == "ARRIVED":
        update_data["arrived_at"] = now
    elif new_status == "COMPLETED":
        update_data["completed_at"] = now
    elif new_status == "CANCELLED":
        update_data["cancelled_at"] = now
        update_data["cancel_reason"] = payload.get("cancel_reason")

    repository.update_repair_request(request_id, update_data)
    return fetch_request(request_id, current_user)
