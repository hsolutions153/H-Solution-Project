from fastapi import APIRouter, Query, status

from app.devices.schemas import DeviceCreate, DeviceResponse, DeviceUpdate
from app.devices.service import create_device, delete_device, fetch_all_devices, fetch_device_by_id, update_device

router = APIRouter(prefix="/devices", tags=["Devices"])


@router.get("/", response_model=list[DeviceResponse])
def get_devices(customer_id: str | None = Query(default=None)):
    return fetch_all_devices(customer_id)


@router.get("/{device_id}", response_model=DeviceResponse)
def get_device(device_id: str):
    return fetch_device_by_id(device_id)


@router.post("/", response_model=DeviceResponse, status_code=status.HTTP_201_CREATED)
def add_device(data: DeviceCreate):
    return create_device(data)


@router.patch("/{device_id}", response_model=DeviceResponse)
def modify_device(device_id: str, data: DeviceUpdate):
    return update_device(device_id, data)


@router.delete("/{device_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_device(device_id: str):
    delete_device(device_id)
