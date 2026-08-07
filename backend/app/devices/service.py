from fastapi import HTTPException, status

from app.devices.models import DEVICE_TYPES
from app.devices.repository import (
    delete_device_from_db,
    get_all_devices,
    get_device_by_id,
    get_device_by_serial_number,
    insert_device,
    update_device_in_db,
)


def _validate_device_values(data: dict):
    if "device_type" in data and data["device_type"] not in DEVICE_TYPES:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid device type")


def _payload(data, *, partial: bool = False):
    if hasattr(data, "model_dump"):
        return data.model_dump(exclude_unset=partial, mode="json")
    return data.dict(exclude_unset=partial)


def fetch_all_devices(customer_id: str | None = None):
    return get_all_devices(customer_id)


def fetch_device_by_id(device_id: str):
    device = get_device_by_id(device_id)
    if not device:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found")
    return device


def create_device(data):
    payload = _payload(data)
    _validate_device_values(payload)
    serial_number = payload.get("serial_number")
    if serial_number and get_device_by_serial_number(serial_number):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Serial number already exists")
    return insert_device(payload)


def update_device(device_id: str, data):
    existing = fetch_device_by_id(device_id)
    payload = _payload(data, partial=True)
    _validate_device_values(payload)
    serial_number = payload.get("serial_number")
    if serial_number:
        duplicate = get_device_by_serial_number(serial_number)
        if duplicate and duplicate["id"] != existing["id"]:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Serial number already exists")
    return update_device_in_db(device_id, payload)


def delete_device(device_id: str):
    fetch_device_by_id(device_id)
    delete_device_from_db(device_id)
