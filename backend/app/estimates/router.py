from fastapi import APIRouter, Depends, status

from app.auth.utils import get_current_user
from app.estimates.schemas import (
    EstimateApprovalRequest,
    EstimateCreate,
    EstimateResponse,
)
from app.estimates.service import (
    approve_or_reject_estimate,
    create_estimate,
    fetch_estimate_by_id,
    fetch_estimate_by_repair_id,
)

router = APIRouter(prefix="/estimates", tags=["Estimates"])


@router.post("", response_model=EstimateResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=EstimateResponse, status_code=status.HTTP_201_CREATED, include_in_schema=False)
def create_new_estimate(data: EstimateCreate, current_user: dict = Depends(get_current_user)):
    return create_estimate(current_user, data)


@router.get("/repair/{repair_id}", response_model=EstimateResponse)
def get_estimate_by_repair(repair_id: str, current_user: dict = Depends(get_current_user)):
    return fetch_estimate_by_repair_id(repair_id, current_user)


@router.get("/{quote_id}", response_model=EstimateResponse)
def get_estimate(quote_id: str, current_user: dict = Depends(get_current_user)):
    return fetch_estimate_by_id(quote_id, current_user)


@router.patch("/{quote_id}/approval", response_model=EstimateResponse)
def handle_estimate_approval(
    quote_id: str,
    data: EstimateApprovalRequest,
    current_user: dict = Depends(get_current_user),
):
    return approve_or_reject_estimate(quote_id, current_user, data)
