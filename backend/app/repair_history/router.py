from fastapi import APIRouter, Depends, Query

from app.auth.utils import get_current_user
from app.repair_history.schemas import (
    DeviceLifecycleResponse,
    RepairHistoryListResponse,
)
from app.repair_history.service import (
    fetch_device_lifecycle,
    fetch_repair_history,
)

router = APIRouter(prefix="/repair-history", tags=["Repair History"])


@router.get("/device/{device_id}", response_model=DeviceLifecycleResponse)
def get_device_lifecycle_history(device_id: str, current_user: dict = Depends(get_current_user)):
    return fetch_device_lifecycle(device_id, current_user)


@router.get("/me", response_model=RepairHistoryListResponse)
def get_my_repair_history(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
):
    return fetch_repair_history(current_user, None, None, page, limit)


@router.get("", response_model=RepairHistoryListResponse)
@router.get("/", response_model=RepairHistoryListResponse, include_in_schema=False)
def get_all_repair_history(
    customer_id: str | None = Query(default=None),
    device_id: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
):
    return fetch_repair_history(current_user, customer_id, device_id, page, limit)
