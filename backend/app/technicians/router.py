from fastapi import APIRouter
from typing import List
from uuid import UUID
from app.technicians.schemas import TechnicianCreate, TechnicianUpdate, TechnicianResponse
from app.technicians.service import (
    fetch_all_technicians,
    fetch_technician_by_id,
    create_technician,
    update_technician,
    delete_technician
)

router = APIRouter(prefix="/technicians", tags=["Technicians Management"])

@router.get("/", response_model=List[TechnicianResponse])
def get_technicians():
    return fetch_all_technicians()

@router.get("/{technician_id}", response_model=TechnicianResponse)
def get_technician(technician_id: UUID):
    return fetch_technician_by_id(str(technician_id))

@router.post("/", response_model=TechnicianResponse)
def add_technician(data: TechnicianCreate):
    return create_technician(data)

@router.patch("/{technician_id}", response_model=TechnicianResponse)
def modify_technician(technician_id: UUID, data: TechnicianUpdate):
    return update_technician(str(technician_id), data)

@router.delete("/{technician_id}", status_code=204)
def remove_technician(technician_id: UUID):
    delete_technician(str(technician_id))
