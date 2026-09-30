import json
import secrets
import time
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
ALLOWED_IMAGE_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/jpg",
    "image/pjpeg",
    "image/x-png",
    "application/octet-stream",
]
VALID_IMAGE_EXTENSIONS = {"jpg", "jpeg", "png", "webp"}



def _device_id() -> str:
    return secrets.token_hex(5).upper()


def _enrich_device(device: dict | None) -> dict | None:
    if not device:
        return device
    enriched = dict(device)
    battery_type = enriched.get("battery_type")
    mfg_year = enriched.get("manufacturing_year")
    notes = enriched.get("notes")
    is_deleted = False

    if notes:
        try:
            if isinstance(notes, str) and notes.startswith("{") and notes.endswith("}"):
                meta = json.loads(notes)
                if isinstance(meta, dict):
                    if meta.get("is_deleted"):
                        is_deleted = True
                    if battery_type is None:
                        battery_type = meta.get("battery_type")
                    if mfg_year is None:
                        mfg_year = meta.get("manufacturing_year")
                    if "display_notes" in meta:
                        enriched["notes"] = meta.get("display_notes")
        except Exception:
            pass

    enriched["battery_type"] = battery_type
    enriched["manufacturing_year"] = mfg_year
    enriched["is_deleted"] = is_deleted
    return enriched


def _enrich_device_list(devices: list, include_deleted: bool = False) -> list:
    if not devices:
        return []
    result = []
    for d in devices:
        if not d:
            continue
        enriched = _enrich_device(d)
        if not include_deleted and enriched.get("is_deleted"):
            continue
        result.append(enriched)
    return result


def upload_device_image(file: UploadFile, current_user: dict) -> str:
    content_type = (file.content_type or "").lower()
    file_extension = (
        file.filename.split(".")[-1].lower()
        if file.filename and "." in file.filename
        else "jpg"
    )

    if (
        content_type not in ALLOWED_IMAGE_TYPES
        and file_extension not in VALID_IMAGE_EXTENSIONS
    ):
        raise AppException(ErrorCode.IMAGE_TYPE_UNSUPPORTED)

    file.file.seek(0, 2)
    file_size = file.file.tell()
    file.file.seek(0)
    if file_size > MAX_IMAGE_SIZE_BYTES:
        raise AppException(ErrorCode.IMAGE_SIZE_TOO_LARGE)

    safe_ext = file_extension if file_extension in VALID_IMAGE_EXTENSIONS else "jpg"
    file_name = f"{uuid.uuid4()}.{safe_ext}"
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
        # Ánh xạ tương thích với ràng buộc kiểm tra của cơ sở dữ liệu hiện tại
        if data["device_type"] in {"ELECTRIC_MOTORBIKE", "ELECTRIC_BIKE", "MOTORBIKE"}:
            data["device_type"] = "SCOOTER"
        elif data["device_type"] not in DEVICE_TYPES:
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
        return _enrich_device_list(get_devices_by_customer_id(current_user["sub"]))
    
    if is_admin:
        return _enrich_device_list(get_all_devices(customer_id))

    raise AppException(ErrorCode.FORBIDDEN)


def fetch_devices_by_customer(customer_id: str, current_user: dict):
    is_admin = _is_role(current_user, ADMIN_ROLE_CODE)
    is_owner = current_user["sub"] == customer_id

    if not (is_admin or is_owner):
        raise AppException(ErrorCode.FORBIDDEN)

    return _enrich_device_list(get_devices_by_customer_id(customer_id), include_deleted=is_admin)


def fetch_device_by_id(device_id: str, current_user: dict, include_deleted: bool = False):
    device = get_device_by_id(device_id)
    if not device:
        raise AppException(ErrorCode.DEVICE_NOT_FOUND)

    is_admin = _is_role(current_user, ADMIN_ROLE_CODE)
    is_owner = device["customer_id"] == current_user["sub"]

    if not (is_admin or is_owner):
        raise AppException(ErrorCode.FORBIDDEN)

    enriched = _enrich_device(device)
    if not is_admin and not include_deleted and enriched.get("is_deleted"):
        raise AppException(ErrorCode.DEVICE_NOT_FOUND)

    return enriched


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

    # Thử chèn trực tiếp. Nếu database từ xa chưa chạy migration cho cột mới,
    # tự động đóng gói pin và năm sản xuất vào metadata trường notes.
    try:
        created = insert_device(dict(payload))
    except Exception as exc:
        err_msg = str(exc)
        if "battery_type" in err_msg or "manufacturing_year" in err_msg or "does not exist" in err_msg or "PGRST204" in err_msg:
            notes = payload.get("notes") or ""
            meta = {}
            if "battery_type" in payload:
                val = payload.pop("battery_type")
                if val is not None:
                    meta["battery_type"] = val
            if "manufacturing_year" in payload:
                val = payload.pop("manufacturing_year")
                if val is not None:
                    meta["manufacturing_year"] = val
            if meta:
                meta["display_notes"] = notes
                payload["notes"] = json.dumps(meta, ensure_ascii=False)
            created = insert_device(payload)
        else:
            raise

    if not created:
        raise AppException(ErrorCode.INTERNAL_SERVER_ERROR)
    return _enrich_device(created)


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

    try:
        updated = update_device_in_db(device_id, dict(payload))
    except Exception as exc:
        err_msg = str(exc)
        if "battery_type" in err_msg or "manufacturing_year" in err_msg or "does not exist" in err_msg or "PGRST204" in err_msg:
            notes = payload.get("notes") if "notes" in payload else (existing.get("notes") or "")
            meta = {}
            if "battery_type" in payload:
                val = payload.pop("battery_type")
                if val is not None:
                    meta["battery_type"] = val
            elif existing.get("battery_type"):
                meta["battery_type"] = existing.get("battery_type")
            if "manufacturing_year" in payload:
                val = payload.pop("manufacturing_year")
                if val is not None:
                    meta["manufacturing_year"] = val
            elif existing.get("manufacturing_year"):
                meta["manufacturing_year"] = existing.get("manufacturing_year")
            if meta:
                meta["display_notes"] = notes
                payload["notes"] = json.dumps(meta, ensure_ascii=False)
            updated = update_device_in_db(device_id, payload)
        else:
            raise

    if not updated:
        raise AppException(ErrorCode.INTERNAL_SERVER_ERROR)
    return _enrich_device(updated)


def delete_device(device_id: str, current_user: dict):
    existing = fetch_device_by_id(device_id, current_user)
    if not existing:
        raise AppException(ErrorCode.DEVICE_NOT_FOUND)

    try:
        deleted = delete_device_from_db(device_id)
        if not deleted:
            check = get_device_by_id(device_id)
            if check:
                raise AppException(ErrorCode.INTERNAL_SERVER_ERROR)
    except Exception as exc:
        err_msg = str(exc)
        if "fk_repair_device" in err_msg or "23503" in err_msg:
            # Phương tiện đã có lịch sử sửa chữa trong hệ thống.
            # Thực hiện soft-delete để không làm hỏng khóa ngoại của đơn sửa chữa,
            # nhưng ẩn hoàn toàn khỏi danh sách phương tiện của khách hàng.
            notes = existing.get("notes") or ""
            meta: dict = {"is_deleted": True}
            if existing.get("battery_type"):
                meta["battery_type"] = existing.get("battery_type")
            if existing.get("manufacturing_year"):
                meta["manufacturing_year"] = existing.get("manufacturing_year")
            meta["display_notes"] = notes

            update_payload: dict = {
                "notes": json.dumps(meta, ensure_ascii=False),
                "is_default": False,
                "updated_by": current_user["sub"],
            }
            orig_serial = existing.get("serial_number")
            if orig_serial and not orig_serial.startswith("__del__"):
                update_payload["serial_number"] = f"__del__{int(time.time())}__{orig_serial}"[:100]

            update_device_in_db(device_id, update_payload)
        else:
            raise

    if existing.get("is_default"):
        # Chuyển quyền mặc định cho xe tiếp theo của khách hàng nếu còn xe
        remaining = _enrich_device_list(get_devices_by_customer_id(existing["customer_id"]))
        if remaining:
            update_device_in_db(remaining[0]["id"], {"is_default": True, "updated_by": current_user["sub"]})


