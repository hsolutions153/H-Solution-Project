from app.repair_requests.schemas import RepairStatus
from app.core.validation import Identifier
from fastapi import APIRouter, Depends, File, Query, UploadFile, status

from app.auth.utils import get_current_user
from app.repair_requests.schemas import (
    QuoteCreateRequest,
    MapboxPublicTokenResponse,
    ReverseGeocodeResponse,
    QuoteResponse,
    RepairRequestCreate,
    RepairRequestListResponse,
    RepairRouteResponse,
    RepairRequestResponse,
    RepairRequestStatusSyncResponse,
    RepairRequestStatusUpdate,
    TechnicianRatingRequest,
    TechnicianRatingResponse,
)
from app.repair_requests.service import (
    add_after_repair_image,
    add_customer_image,
    add_diagnostic_image,
    create_quote_for_request,
    create_request,
    fetch_all_requests,
    fetch_mapbox_public_token,
    reverse_geocode_location,
    fetch_my_requests,
    fetch_quotes_for_request,
    fetch_route_for_technician,
    fetch_request,
    fetch_request_status_sync,
    fetch_technician_requests,
    submit_technician_rating,
    update_request_status,
)

router = APIRouter(prefix="/repair-requests", tags=["Repair Requests"])


@router.post("", response_model=RepairRequestResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=RepairRequestResponse, status_code=status.HTTP_201_CREATED, include_in_schema=False)
def create_repair_request(data: RepairRequestCreate, current_user: dict = Depends(get_current_user)):
    return create_request(current_user, data)


@router.get("/me", response_model=RepairRequestListResponse)
def get_my_repair_requests(
    status: RepairStatus | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
):
    return fetch_my_requests(current_user, status, page, limit)


@router.get("/technician/me", response_model=RepairRequestListResponse)
def get_my_technician_requests(
    status: RepairStatus | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
):
    return fetch_technician_requests(current_user, status, page, limit)


@router.get("/map-token", response_model=MapboxPublicTokenResponse)
def get_mapbox_public_token(current_user: dict = Depends(get_current_user)):
    return fetch_mapbox_public_token(current_user)


@router.get("/reverse-geocode", response_model=ReverseGeocodeResponse)
def reverse_geocode(
    latitude: float = Query(ge=-90, le=90),
    longitude: float = Query(ge=-180, le=180),
    current_user: dict = Depends(get_current_user),
):
    return reverse_geocode_location(latitude, longitude, current_user)


@router.get("/{request_id}/route", response_model=RepairRouteResponse)
def get_route_for_technician(request_id: Identifier, current_user: dict = Depends(get_current_user)):
    return fetch_route_for_technician(request_id, current_user)


@router.get("", response_model=RepairRequestListResponse)
@router.get("/", response_model=RepairRequestListResponse, include_in_schema=False)
def get_repair_requests(
    status: RepairStatus | None = Query(default=None),
    customer_id: Identifier | None = Query(default=None),
    technician_id: Identifier | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=500),
    current_user: dict = Depends(get_current_user),
):
    return fetch_all_requests(current_user, status, customer_id, technician_id, page, limit)


@router.get("/{request_id}", response_model=RepairRequestResponse)
def get_repair_request(request_id: Identifier, current_user: dict = Depends(get_current_user)):
    return fetch_request(request_id, current_user)


@router.get("/{request_id}/status", response_model=RepairRequestStatusSyncResponse)
def get_repair_request_status_sync(request_id: Identifier, current_user: dict = Depends(get_current_user)):
    return fetch_request_status_sync(request_id, current_user)


@router.patch("/{request_id}/status", response_model=RepairRequestResponse)
def modify_repair_request_status(
    request_id: Identifier,
    data: RepairRequestStatusUpdate,
    current_user: dict = Depends(get_current_user),
):
    return update_request_status(request_id, current_user, data)


@router.post("/{request_id}/after-repair-images", response_model=RepairRequestResponse)
def upload_after_repair_image(
    request_id: Identifier,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    return add_after_repair_image(request_id, file, current_user)


@router.post("/{request_id}/diagnostic-images", response_model=RepairRequestResponse)
def upload_diagnostic_image(
    request_id: Identifier,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    return add_diagnostic_image(request_id, file, current_user)


@router.post("/{request_id}/images", response_model=RepairRequestResponse)
@router.post("/{request_id}/customer-images", response_model=RepairRequestResponse, include_in_schema=False)
def upload_customer_image(
    request_id: Identifier,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    return add_customer_image(request_id, file, current_user)


@router.post("/{request_id}/quotes", response_model=QuoteResponse, status_code=status.HTTP_201_CREATED)
def create_quote(
    request_id: Identifier,
    data: QuoteCreateRequest,
    current_user: dict = Depends(get_current_user),
):
    return create_quote_for_request(request_id, data.model_dump(), current_user)


@router.get("/{request_id}/quotes", response_model=list[QuoteResponse])
def get_quotes(
    request_id: Identifier,
    current_user: dict = Depends(get_current_user),
):
    return fetch_quotes_for_request(request_id, current_user)


@router.post("/{request_id}/rating", response_model=TechnicianRatingResponse)
def rate_technician(
    request_id: Identifier,
    data: TechnicianRatingRequest,
    current_user: dict = Depends(get_current_user),
):
    return submit_technician_rating(request_id, data.model_dump(), current_user)


@router.patch("/{request_id}/assign")
def assign_technician_endpoint(
    request_id: Identifier,
    payload: dict,
    current_user: dict = Depends(get_current_user),
):
    from app.orders.service import assign_technician
    tech_id = payload.get("technician_id")
    order = assign_technician(request_id, tech_id, current_user["sub"])
    return {"message": "Phân công kỹ thuật viên thành công", "order": order}

