import secrets
import uuid
from collections import defaultdict
from datetime import datetime, timezone

from fastapi import UploadFile

from app.auth import repository as auth_repository
from app.core import storage
from app.core.exceptions import AppException, ErrorCode
from app.customers.models import ADMIN_ROLE_CODE, CUSTOMER_ROLE_CODE
from app.repair_requests import repository
from app.repair_requests.models import (
    ISSUE_TYPES,
    REQUEST_STATUSES,
    TECHNICIAN_ROLE_CODE,
    TECHNICIAN_TRANSITIONS,
)

MAX_IMAGE_SIZE_MB = 50
MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024
ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"]


def _payload(data):
    if hasattr(data, "model_dump"):
        return data.model_dump(mode="json")
    return data.dict()


def _role_id(code: str) -> str:
    role = auth_repository.get_role_by_code(code)
    if not role:
        raise AppException(ErrorCode.ROLE_NOT_CONFIGURED)
    return role["id"]


def _is_role(current_user: dict, code: str) -> bool:
    if current_user.get("role") == code:
        return True
    try:
        return current_user.get("role_id") == _role_id(code)
    except Exception:
        return False


def _request_id() -> str:
    return secrets.token_hex(5).upper()


def _image_id() -> str:
    return secrets.token_hex(5).upper()


def _attach_images_to_list(items: list[dict]) -> list[dict]:
    if not items:
        return []
    repair_ids = [item["id"] for item in items]
    images = repository.get_repair_images_by_repair_ids(repair_ids)

    images_by_repair = defaultdict(list)
    for img in images:
        images_by_repair[img["repair_id"]].append(img)

    for item in items:
        item["images"] = images_by_repair.get(item["id"], [])
    return items


def _list(customer_id: str | None, technician_id: str | None, request_status: str | None, page: int, limit: int):
    if request_status and request_status not in REQUEST_STATUSES:
        raise AppException(ErrorCode.VALIDATION_ERROR, message="Trạng thái yêu cầu không hợp lệ")
    items, total = repository.get_repair_requests(
        customer_id=customer_id,
        technician_id=technician_id,
        request_status=request_status,
        page=page,
        limit=limit,
    )
    return {"items": _attach_images_to_list(items), "total": total, "page": page, "limit": limit}


def create_request(current_user: dict, data):
    if not _is_role(current_user, CUSTOMER_ROLE_CODE):
        raise AppException(ErrorCode.FORBIDDEN)
    payload = _payload(data)

    issue_type = (payload.get("issue_type") or "").upper()
    if issue_type not in ISSUE_TYPES:
        raise AppException(ErrorCode.INVALID_ISSUE_TYPE)

    device_id = payload.get("device_id")
    if not repository.get_device_for_customer(device_id, current_user["sub"]):
        raise AppException(ErrorCode.DEVICE_NOT_FOUND)

    # Chuẩn hóa linh hoạt các trường giữa Team A & Team B
    description = payload.get("description") or payload.get("issue_description") or ""
    address = payload.get("address_detail") or payload.get("location_address") or ""
    lat = payload.get("location_lat") or payload.get("latitude")
    lng = payload.get("location_lng") or payload.get("longitude")
    
    is_sos = payload.get("is_sos", False)
    if payload.get("request_type") == "SOS":
        is_sos = True

    images = payload.get("image_urls") or payload.get("inspection_images") or []

    request_id = _request_id()
    record = {
        "id": request_id,
        "request_code": _request_id(),
        "customer_id": current_user["sub"],
        "device_id": device_id,
        "issue_type": issue_type,
        "issue_description": description,
        "location_address": address,
        "latitude": lat,
        "longitude": lng,
        "is_sos": is_sos,
        "status": "REQUESTED",
        "created_by": current_user["sub"],
        "updated_by": current_user["sub"],
    }
    created = repository.create_repair_request(record)
    if not created:
        raise AppException(ErrorCode.INTERNAL_SERVER_ERROR)

    for img_url in images:
        repository.create_repair_image({
            "id": _image_id(),
            "repair_id": request_id,
            "image_url": img_url,
            "image_type": "BEFORE_REPAIR",
            "created_by": current_user["sub"],
        })

    return fetch_request(request_id, current_user)


def fetch_my_requests(current_user: dict, request_status: str | None, page: int, limit: int):
    if not _is_role(current_user, CUSTOMER_ROLE_CODE):
        raise AppException(ErrorCode.FORBIDDEN)
    return _list(current_user["sub"], None, request_status, page, limit)


def fetch_technician_requests(current_user: dict, request_status: str | None, page: int, limit: int):
    if not _is_role(current_user, TECHNICIAN_ROLE_CODE):
        raise AppException(ErrorCode.FORBIDDEN)
    return _list(None, current_user["sub"], request_status, page, limit)


def fetch_all_requests(current_user: dict, request_status: str | None, customer_id: str | None, technician_id: str | None, page: int, limit: int):
    if not _is_role(current_user, ADMIN_ROLE_CODE):
        raise AppException(ErrorCode.FORBIDDEN)
    return _list(customer_id, technician_id, request_status, page, limit)


def fetch_request(request_id: str, current_user: dict):
    request = repository.get_repair_request_by_id(request_id)
    if not request:
        raise AppException(ErrorCode.REQUEST_NOT_FOUND)
    can_view = (
        _is_role(current_user, ADMIN_ROLE_CODE)
        or (_is_role(current_user, CUSTOMER_ROLE_CODE) and request["customer_id"] == current_user["sub"])
        or (_is_role(current_user, TECHNICIAN_ROLE_CODE) and request.get("technician_id") == current_user["sub"])
    )
    if not can_view:
        raise AppException(ErrorCode.FORBIDDEN)

    images = repository.get_repair_images(request_id)
    request_data = dict(request)
    request_data["images"] = images
    return request_data


def fetch_request_status_sync(request_id: str, current_user: dict):
    request = repository.get_repair_request_by_id(request_id)
    if not request:
        raise AppException(ErrorCode.REQUEST_NOT_FOUND)

    can_view = (
        _is_role(current_user, ADMIN_ROLE_CODE)
        or (_is_role(current_user, CUSTOMER_ROLE_CODE) and request["customer_id"] == current_user["sub"])
        or (_is_role(current_user, TECHNICIAN_ROLE_CODE) and request.get("technician_id") == current_user["sub"])
    )
    if not can_view:
        raise AppException(ErrorCode.FORBIDDEN)

    technician_info = None
    if request.get("technician_id"):
        tech_user = auth_repository.get_user_by_id(request["technician_id"])
        if tech_user:
            technician_info = {
                "name": tech_user.get("full_name", ""),
                "phone": tech_user.get("phone", ""),
            }

    return {
        "request_id": request["id"],
        "current_status": request["status"],
        "technician_info": technician_info,
        "last_updated": request.get("updated_at") or request.get("created_at"),
    }


def update_request_status(request_id: str, current_user: dict, data):
    request = repository.get_repair_request_by_id(request_id)
    if not request:
        raise AppException(ErrorCode.REQUEST_NOT_FOUND)
    payload = _payload(data)
    new_status = payload["status"].upper()
    if new_status not in REQUEST_STATUSES:
        raise AppException(ErrorCode.VALIDATION_ERROR, message="Trạng thái yêu cầu không hợp lệ")

    is_admin = _is_role(current_user, ADMIN_ROLE_CODE)
    is_customer = _is_role(current_user, CUSTOMER_ROLE_CODE) and request["customer_id"] == current_user["sub"]
    is_technician = _is_role(current_user, TECHNICIAN_ROLE_CODE) and request.get("technician_id") == current_user["sub"]

    if is_admin:
        allowed = (
            new_status in {"CONFIRMED", "ASSIGNED", "CANCELLED"}
            and request["status"] not in {"COMPLETED", "CANCELLED"}
        )
    elif is_customer:
        allowed = (
            request["status"] in {"REQUESTED", "PENDING", "CONFIRMED"}
            and new_status == "CANCELLED"
        )
    elif is_technician:
        allowed = new_status in TECHNICIAN_TRANSITIONS.get(request["status"], set())
        if new_status == "REPAIRING" and allowed and not repository.has_accepted_quote(request_id):
            raise AppException(ErrorCode.QUOTE_NOT_ACCEPTED)
    else:
        allowed = False

    if not allowed:
        raise AppException(ErrorCode.INVALID_STATUS_TRANSITION)

    now = datetime.now(timezone.utc).isoformat()
    update_data = {
        "status": new_status,
        "updated_by": current_user["sub"],
    }
    if new_status == "ACCEPTED":
        update_data["accepted_at"] = now
    elif new_status in {"ARRIVED", "EN_ROUTE"}:
        update_data["arrived_at"] = now
    elif new_status in {"DIAGNOSED", "DIAGNOSING", "ESTIMATE_SUBMITTED"}:
        update_data["diagnosed_at"] = now
    elif new_status == "REPAIRING":
        update_data["repairing_at"] = now
    elif new_status == "COMPLETED":
        update_data["completed_at"] = now
    elif new_status == "CANCELLED":
        update_data["cancelled_at"] = now
        update_data["cancel_reason"] = payload.get("cancel_reason")

    repository.update_repair_request(request_id, update_data)
    repository.add_status_history(
        {
            "id": _request_id(),
            "repair_id": request_id,
            "status": new_status,
            "changed_by": current_user["sub"],
            "note": payload.get("cancel_reason"),
        }
    )
    return fetch_request(request_id, current_user)


def add_after_repair_image(request_id: str, file: UploadFile, current_user: dict):
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise AppException(ErrorCode.IMAGE_TYPE_UNSUPPORTED)

    file.file.seek(0, 2)
    file_size = file.file.tell()
    file.file.seek(0)
    if file_size > MAX_IMAGE_SIZE_BYTES:
        raise AppException(ErrorCode.IMAGE_SIZE_TOO_LARGE)

    request = repository.get_repair_request_by_id(request_id)
    if not request:
        raise AppException(ErrorCode.REQUEST_NOT_FOUND)

    is_assigned_technician = (
        _is_role(current_user, TECHNICIAN_ROLE_CODE) and request.get("technician_id") == current_user["sub"]
    )
    if not is_assigned_technician:
        raise AppException(ErrorCode.FORBIDDEN)

    file_extension = file.filename.split('.')[-1] if '.' in file.filename else 'jpg'
    file_name = f"{uuid.uuid4()}.{file_extension}"
    supabase_path = f"public/after-repair/{request_id}/{file_name}"

    public_url = storage.upload_file_to_supabase(file, supabase_path)

    repository.create_repair_image({
        "id": _image_id(),
        "repair_id": request_id,
        "image_url": public_url,
        "image_type": "AFTER_REPAIR",
        "description": "Ảnh sau khi sửa chữa",
        "created_by": current_user["sub"],
    })

    return fetch_request(request_id, current_user)
