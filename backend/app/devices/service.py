import secrets
import uuid

from fastapi import UploadFile

from app.auth import repository as auth_repository
from app.core import storage
from app.core.exceptions import AppException, ErrorCode
from app.customers.models import ADMIN_ROLE_CODE, CUSTOMER_ROLE_CODE
from app.devices.models import DEVICE_TYPES
from app.devices.repository import (
    clear_default_device,
    delete_device_from_db,
    get_all_devices,
    get_devices_by_customer_id,
    get_device_by_id,
    get_device_by_serial_number,
    insert_device,
    update_device_in_db,
)

MAX_IMAGE_SIZE_MB = 10
MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024
ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"]


def _device_id() -> str:
    return secrets.token_hex(5).upper()


def upload_device_image(file: UploadFile, current_user: dict) -> str:
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise AppException(ErrorCode.IMAGE_TYPE_UNSUPPORTED)

    file.file.seek(0, 2)
    file_size = file.file.tell()
    file.file.seek(0)
    if file_size > MAX_IMAGE_SIZE_BYTES:
        raise AppException(ErrorCode.IMAGE_SIZE_TOO_LARGE)

    file_extension = file.filename.split(".")[-1] if file.filename and "." in file.filename else "jpg"
    file_name = f"{uuid.uuid4()}.{file_extension}"
    supabase_path = f"public/devices/{current_user['sub']}/{file_name}"

    return storage.upload_file_to_supabase(file, supabase_path)


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


def _validate_device_values(data: dict):
    if "device_type" in data and data["device_type"]:
        data["device_type"] = data["device_type"].upper()
        if data["device_type"] not in DEVICE_TYPES:
            raise AppException(ErrorCode.INVALID_DEVICE_TYPE)


def _payload(data, *, partial: bool = False):
    if isinstance(data, dict):
        return data
    if hasattr(data, "model_dump"):
        return data.model_dump(exclude_unset=partial, mode="json")
    if hasattr(data, "dict"):
        return data.dict(exclude_unset=partial)
    return dict(data)


def fetch_all_devices(customer_id: str | None, current_user: dict):
    is_admin = _is_role(current_user, ADMIN_ROLE_CODE)
    is_customer = _is_role(current_user, CUSTOMER_ROLE_CODE)

    if is_customer:
        return get_devices_by_customer_id(current_user["sub"])
    
    if is_admin:
        return get_all_devices(customer_id)

    raise AppException(ErrorCode.FORBIDDEN)


def fetch_devices_by_customer(customer_id: str, current_user: dict):
    is_admin = _is_role(current_user, ADMIN_ROLE_CODE)
    is_owner = current_user["sub"] == customer_id

    if not (is_admin or is_owner):
        raise AppException(ErrorCode.FORBIDDEN)

    return get_devices_by_customer_id(customer_id)


def fetch_device_by_id(device_id: str, current_user: dict):
    device = get_device_by_id(device_id)
    if not device:
        raise AppException(ErrorCode.DEVICE_NOT_FOUND)

    is_admin = _is_role(current_user, ADMIN_ROLE_CODE)
    is_owner = device["customer_id"] == current_user["sub"]

    if not (is_admin or is_owner):
        raise AppException(ErrorCode.FORBIDDEN)

    return device


def create_device(data, current_user: dict):
    payload = _payload(data)
    _validate_device_values(payload)

    is_admin = _is_role(current_user, ADMIN_ROLE_CODE)
    
    customer_id = payload.get("customer_id")
    if not customer_id or not is_admin:
        customer_id = current_user["sub"]
    payload["customer_id"] = customer_id

    serial_number = payload.get("serial_number")
    if serial_number and get_device_by_serial_number(serial_number):
        raise AppException(ErrorCode.SERIAL_NUMBER_EXISTS)

    requested_default = payload.pop("is_default", None)
    has_existing_devices = bool(get_devices_by_customer_id(customer_id))
    if not has_existing_devices:
        # First device for this customer is always the default one.
        payload["is_default"] = True
    elif requested_default:
        clear_default_device(customer_id)
        payload["is_default"] = True
    else:
        payload["is_default"] = False

    device_id = _device_id()
    payload["id"] = device_id
    payload["created_by"] = current_user["sub"]
    payload["updated_by"] = current_user["sub"]

    created = insert_device(payload)
    if not created:
        raise AppException(ErrorCode.INTERNAL_SERVER_ERROR)
    return created


def update_device(device_id: str, data, current_user: dict):
    existing = fetch_device_by_id(device_id, current_user)
    payload = _payload(data, partial=True)
    _validate_device_values(payload)

    serial_number = payload.get("serial_number")
    if serial_number:
        duplicate = get_device_by_serial_number(serial_number)
        if duplicate and duplicate["id"] != existing["id"]:
            raise AppException(ErrorCode.SERIAL_NUMBER_EXISTS)

    if payload.get("is_default") is True:
        # Only one device can be default per customer, so unset the others first.
        clear_default_device(existing["customer_id"], exclude_device_id=device_id)

    payload["updated_by"] = current_user["sub"]
    updated = update_device_in_db(device_id, payload)
    if not updated:
        raise AppException(ErrorCode.INTERNAL_SERVER_ERROR)
    return updated


def delete_device(device_id: str, current_user: dict):
    existing = fetch_device_by_id(device_id, current_user)
    deleted = delete_device_from_db(device_id)
    if not deleted:
        raise AppException(ErrorCode.INTERNAL_SERVER_ERROR)

    if existing.get("is_default"):
        # Promote another device of this customer to default, if any remain.
        remaining = get_devices_by_customer_id(existing["customer_id"])
        if remaining:
            update_device_in_db(remaining[0]["id"], {"is_default": True, "updated_by": current_user["sub"]})
