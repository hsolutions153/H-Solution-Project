from fastapi import HTTPException, status
from app.technicians.repository import (
    get_all_technicians,
    get_technician_by_id,
    insert_technician,
    update_technician_in_db,
    delete_technician_from_db,
    get_technician_by_email,
)

def fetch_all_technicians():
    return get_all_technicians()

def fetch_technician_by_id(tech_id: str):
    tech = get_technician_by_id(tech_id)
    if not tech:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Technician not found")
    return tech

def create_technician(data):
    if get_technician_by_email(str(data.email)):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Technician email already exists")
    payload = data.model_dump(mode="json") if hasattr(data, "model_dump") else data.dict()
    return insert_technician(payload)

def update_technician(tech_id: str, data):
    existing = get_technician_by_id(tech_id)
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Technician not found")
    
    updated_data = (
        data.model_dump(exclude_unset=True, mode="json")
        if hasattr(data, "model_dump")
        else data.dict(exclude_unset=True)
    )
    if "email" in updated_data:
        duplicate = get_technician_by_email(updated_data["email"])
        if duplicate and duplicate["id"] != tech_id:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Technician email already exists")
    return update_technician_in_db(tech_id, updated_data)

def delete_technician(tech_id: str):
    existing = get_technician_by_id(tech_id)
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Technician not found")
    
    delete_technician_from_db(tech_id)
    return {"message": "Technician deleted successfully"}
