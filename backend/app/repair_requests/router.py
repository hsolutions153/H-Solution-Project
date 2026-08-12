from fastapi import APIRouter, Depends, Query, status

from app.auth.utils import get_current_user
from app.repair_requests.schemas import (
    RepairRequestCreate,
    RepairRequestListResponse,
    RepairRequestResponse,
    RepairRequestStatusUpdate,
)
from app.repair_requests.service import (
    create_request,
    fetch_all_requests,
    fetch_my_requests,
    fetch_request,
    fetch_technician_requests,
    update_request_status,
)

router = APIRouter(prefix="/repair-requests", tags=["Repair Requests"])


@router.post("", response_model=RepairRequestResponse, status_code=status.HTTP_201_CREATED)
def create_repair_request(data: RepairRequestCreate, current_user: dict = Depends(get_current_user)):
    return create_request(current_user, data)


@router.get("/me", response_model=RepairRequestListResponse)
def get_my_repair_requests(
    status: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
):
    return fetch_my_requests(current_user, status, page, limit)


@router.get("/technician/me", response_model=RepairRequestListResponse)
def get_my_technician_requests(
    status: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
):
    return fetch_technician_requests(current_user, status, page, limit)


@router.get("", response_model=RepairRequestListResponse)
def get_repair_requests(
    status: str | None = Query(default=None),
    customer_id: str | None = Query(default=None),
    technician_id: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
):
    return fetch_all_requests(current_user, status, customer_id, technician_id, page, limit)


@router.get("/{request_id}", response_model=RepairRequestResponse)
def get_repair_request(request_id: str, current_user: dict = Depends(get_current_user)):
    return fetch_request(request_id, current_user)


@router.patch("/{request_id}/status", response_model=RepairRequestResponse)
def modify_repair_request_status(
    request_id: str,
    data: RepairRequestStatusUpdate,
    current_user: dict = Depends(get_current_user),
):
    return update_request_status(request_id, current_user, data)
