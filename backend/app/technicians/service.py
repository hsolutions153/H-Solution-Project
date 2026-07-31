from fastapi import HTTPException, status
from app.technicians.repository import (
    get_all_technicians,
    get_technician_by_id,
    insert_technician,
    update_technician_in_db,
    delete_technician_from_db
)

def fetch_all_technicians():
    return get_all_technicians()

def fetch_technician_by_id(tech_id: int):
    tech = get_technician_by_id(tech_id)
    if not tech:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Technician not found")
    return tech

def create_technician(data):
    new_id = len(get_all_technicians()) + 1
    new_tech = {
        "id": new_id,
        "full_name": data.full_name,
        "email": data.email,
        "phone": data.phone,
        "specialization": data.specialization
    }
    return insert_technician(new_tech)

def update_technician(tech_id: int, data):
    existing = get_technician_by_id(tech_id)
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Technician not found")
    
    updated_data = data.dict(exclude_unset=True)
    return update_technician_in_db(tech_id, updated_data)

def delete_technician(tech_id: int):
    existing = get_technician_by_id(tech_id)
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Technician not found")
    
    delete_technician_from_db(tech_id)
    return {"message": "Technician deleted successfully"}