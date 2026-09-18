from fastapi import APIRouter, Depends, File, Query, UploadFile, status

from app.auth.utils import get_current_user
from app.repair_requests.schemas import (
    QuoteCreateRequest,
    QuoteResponse,
    RepairRequestCreate,
    RepairRequestListResponse,
    RepairRequestResponse,
    RepairRequestStatusSyncResponse,
    RepairRequestStatusUpdate,
)
from app.repair_requests.service import (
    add_after_repair_image,
    create_quote_for_request,
    create_request,
    fetch_all_requests,
    fetch_my_requests,
    fetch_quotes_for_request,
    fetch_request,
    fetch_request_status_sync,
    fetch_technician_requests,
    update_request_status,
)

router = APIRouter(prefix="/repair-requests", tags=["Repair Requests"])


@router.post("", response_model=RepairRequestResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=RepairRequestResponse, status_code=status.HTTP_201_CREATED, include_in_schema=False)
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
@router.get("/", response_model=RepairRequestListResponse, include_in_schema=False)
def get_repair_requests(
    status: str | None = Query(default=None),
    customer_id: str | None = Query(default=None),
    technician_id: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=500),
    current_user: dict = Depends(get_current_user),
):
    return fetch_all_requests(current_user, status, customer_id, technician_id, page, limit)


@router.get("/{request_id}", response_model=RepairRequestResponse)
def get_repair_request(request_id: str, current_user: dict = Depends(get_current_user)):
    return fetch_request(request_id, current_user)


@router.get("/{request_id}/status", response_model=RepairRequestStatusSyncResponse)
def get_repair_request_status_sync(request_id: str, current_user: dict = Depends(get_current_user)):
    """API đồng bộ trạng thái thời gian thực và thông tin thợ cho Team A."""
    return fetch_request_status_sync(request_id, current_user)


@router.patch("/{request_id}/status", response_model=RepairRequestResponse)
def modify_repair_request_status(
    request_id: str,
    data: RepairRequestStatusUpdate,
    current_user: dict = Depends(get_current_user),
):
    return update_request_status(request_id, current_user, data)


@router.post("/{request_id}/after-repair-images", response_model=RepairRequestResponse)
def upload_after_repair_image(
    request_id: str,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    return add_after_repair_image(request_id, file, current_user)


@router.post("/{request_id}/quotes", response_model=QuoteResponse, status_code=status.HTTP_201_CREATED)
def create_quote(
    request_id: str,
    data: QuoteCreateRequest,
    current_user: dict = Depends(get_current_user),
):
    return create_quote_for_request(request_id, data.model_dump(), current_user)


@router.get("/{request_id}/quotes", response_model=list[QuoteResponse])
def get_quotes(
    request_id: str,
    current_user: dict = Depends(get_current_user),
):
    return fetch_quotes_for_request(request_id, current_user)
