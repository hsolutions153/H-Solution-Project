from datetime import datetime, timezone

from fastapi import HTTPException, status

from app.technicians.models import KYC_STATUSES, SKILLS
from app.technicians.repository import (
    delete_technician_from_db,
    get_all_technicians,
    get_technician_by_id_card_number,
    get_technician_by_user_id,
    insert_technician,
    update_technician_in_db,
)


def _payload(data, *, partial: bool = False):
    if hasattr(data, "model_dump"):
        return data.model_dump(exclude_unset=partial, mode="json")
    return data.dict(exclude_unset=partial)


def _validate_profile_values(data: dict):
    if "skills" in data and data["skills"] not in SKILLS:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid technician skills")


def fetch_all_technicians(kyc_status: str | None = None):
    if kyc_status and kyc_status not in KYC_STATUSES:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid KYC status")
    return get_all_technicians(kyc_status)


def fetch_technician_by_user_id(user_id: str):
    technician = get_technician_by_user_id(user_id)
    if not technician:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Technician profile not found")
    return technician


def create_technician(data):
    payload = _payload(data)
    _validate_profile_values(payload)
    if get_technician_by_user_id(payload["user_id"]):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Technician profile already exists")
    if get_technician_by_id_card_number(payload["id_card_number"]):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="ID card number already exists")
    insert_technician(payload)
    return fetch_technician_by_user_id(payload["user_id"])


def update_technician(user_id: str, data):
    existing = fetch_technician_by_user_id(user_id)
    payload = _payload(data, partial=True)
    if not payload:
        return existing
    _validate_profile_values(payload)
    update_technician_in_db(user_id, payload)
    return fetch_technician_by_user_id(user_id)


def review_technician_kyc(user_id: str, data):
    fetch_technician_by_user_id(user_id)
    payload = _payload(data)
    if payload["kyc_status"] not in KYC_STATUSES:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid KYC status")
    update_technician_in_db(
        user_id,
        {
            "kyc_status": payload["kyc_status"],
            "kyc_note": payload.get("kyc_note"),
            "kyc_reviewed_by": payload["reviewed_by"],
            "kyc_reviewed_at": datetime.now(timezone.utc).isoformat(),
        },
    )
    return fetch_technician_by_user_id(user_id)


def delete_technician(user_id: str):
    fetch_technician_by_user_id(user_id)
    delete_technician_from_db(user_id)
