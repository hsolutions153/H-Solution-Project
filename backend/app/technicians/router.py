from fastapi import APIRouter
from typing import List
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

@router.get("/{id}", response_model=TechnicianResponse)
def get_technician(id: int):
    return fetch_technician_by_id(id)

@router.post("/", response_model=TechnicianResponse)
def add_technician(data: TechnicianCreate):
    return create_technician(data)

@router.patch("/{id}", response_model=TechnicianResponse)
def modify_technician(id: int, data: TechnicianUpdate):
    return update_technician(id, data)

@router.delete("/{id}")
def remove_technician(id: int):
    return delete_technician(id)