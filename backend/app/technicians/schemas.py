from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field


class TechnicianUser(BaseModel):
    id: str
    full_name: str
    email: str
    phone: str | None = None
    is_active: bool


class TechnicianCreate(BaseModel):
    """Creates a profile for an existing user whose role is technician."""

    user_id: str = Field(min_length=1, max_length=10)
    id_card_number: str = Field(min_length=12, max_length=12)
    id_card_front_url: str | None = Field(default=None, max_length=500)
    id_card_back_url: str | None = Field(default=None, max_length=500)
    certificate_url: str | None = Field(default=None, max_length=500)
    skills: str = "BOTH"
    specialization: str | None = Field(default=None, max_length=255)
    experience_years: int = Field(default=0, ge=0)


class TechnicianUpdate(BaseModel):
    id_card_front_url: str | None = Field(default=None, max_length=500)
    id_card_back_url: str | None = Field(default=None, max_length=500)
    certificate_url: str | None = Field(default=None, max_length=500)
    skills: str | None = None
    specialization: str | None = Field(default=None, max_length=255)
    experience_years: int | None = Field(default=None, ge=0)
    is_online: bool | None = None
    current_lat: Decimal | None = None
    current_lng: Decimal | None = None


class TechnicianKycReview(BaseModel):
    kyc_status: str
    kyc_note: str | None = None
    reviewed_by: str = Field(min_length=1, max_length=10)


class TechnicianResponse(BaseModel):
    user_id: str
    id_card_number: str
    id_card_front_url: str | None = None
    id_card_back_url: str | None = None
    certificate_url: str | None = None
    skills: str
    specialization: str | None = None
    experience_years: int
    kyc_status: str
    kyc_reviewed_by: str | None = None
    kyc_reviewed_at: datetime | None = None
    kyc_note: str | None = None
    is_online: bool
    current_lat: Decimal | None = None
    current_lng: Decimal | None = None
    last_location_at: datetime | None = None
    rating_avg: Decimal
    total_jobs_done: int
    created_at: datetime
    updated_at: datetime
    user: TechnicianUser | None = None

    class Config:
        from_attributes = True
