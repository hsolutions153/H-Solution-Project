from fastapi import APIRouter, Query, status

from app.technicians.schemas import (
    TechnicianCreate,
    TechnicianKycReview,
    TechnicianResponse,
    TechnicianUpdate,
)
from app.technicians.service import (
    create_technician,
    delete_technician,
    fetch_all_technicians,
    fetch_technician_by_user_id,
    review_technician_kyc,
    update_technician,
)

router = APIRouter(prefix="/technicians", tags=["Technicians"])


@router.get("/", response_model=list[TechnicianResponse])
def get_technicians(kyc_status: str | None = Query(default=None)):
    return fetch_all_technicians(kyc_status)


@router.get("/{user_id}", response_model=TechnicianResponse)
def get_technician(user_id: str):
    return fetch_technician_by_user_id(user_id)


@router.post("/", response_model=TechnicianResponse, status_code=status.HTTP_201_CREATED)
def add_technician(data: TechnicianCreate):
    return create_technician(data)


@router.patch("/{user_id}", response_model=TechnicianResponse)
def modify_technician(user_id: str, data: TechnicianUpdate):
    return update_technician(user_id, data)


@router.patch("/{user_id}/kyc", response_model=TechnicianResponse)
def review_kyc(user_id: str, data: TechnicianKycReview):
    return review_technician_kyc(user_id, data)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_technician(user_id: str):
    delete_technician(user_id)
