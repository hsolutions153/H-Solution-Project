from app.core.validation import Identifier
from fastapi import APIRouter, Depends, File, Query, UploadFile, status

from app.auth.utils import get_current_user
from app.devices.schemas import DeviceCreate, DeviceImageResponse, DeviceResponse, DeviceUpdate
from app.devices.service import (
    create_device,
    delete_device,
    fetch_all_devices,
    fetch_device_by_id,
    fetch_devices_by_customer,
    update_device,
    upload_device_image,
)

router = APIRouter(prefix="/devices", tags=["Devices"])


@router.post("/images", response_model=DeviceImageResponse, status_code=status.HTTP_201_CREATED)
def upload_image(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    return {"image_url": upload_device_image(file, current_user)}


@router.get("", response_model=list[DeviceResponse])
@router.get("/", response_model=list[DeviceResponse], include_in_schema=False)
def get_devices(
    customer_id: Identifier | None = Query(default=None),
    current_user: dict = Depends(get_current_user),
):
    return fetch_all_devices(customer_id, current_user)


@router.get("/customer/{customer_id}", response_model=list[DeviceResponse])
def get_customer_devices(
    customer_id: Identifier,
    current_user: dict = Depends(get_current_user),
):
    return fetch_devices_by_customer(customer_id, current_user)


@router.get("/{device_id}", response_model=DeviceResponse)
def get_device(
    device_id: Identifier,
    current_user: dict = Depends(get_current_user),
):
    return fetch_device_by_id(device_id, current_user)


@router.post("", response_model=DeviceResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=DeviceResponse, status_code=status.HTTP_201_CREATED, include_in_schema=False)
def add_device(
    data: DeviceCreate,
    current_user: dict = Depends(get_current_user),
):
    return create_device(data, current_user)


@router.patch("/{device_id}", response_model=DeviceResponse)
def modify_device(
    device_id: Identifier,
    data: DeviceUpdate,
    current_user: dict = Depends(get_current_user),
):
    return update_device(device_id, data, current_user)


@router.delete("/{device_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_device(
    device_id: Identifier,
    current_user: dict = Depends(get_current_user),
):
    delete_device(device_id, current_user)
