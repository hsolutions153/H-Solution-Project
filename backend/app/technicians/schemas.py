from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field


class TechnicianUser(BaseModel):
    id: str
    full_name: str | None = None
    email: str | None = None
    phone: str | None = None
    avatar_url: str | None = None
    is_active: bool = True


class TechnicianCreate(BaseModel):
    user_id: str | None = None
    full_name: str = Field(min_length=1, max_length=100)
    phone: str | None = None
    email: str | None = None
    password: str | None = None
    id_card_number: str | None = None
    id_card_front_url: str | None = None
    id_card_back_url: str | None = None
    certificate_url: str | None = None
    skills: str = "BOTH"
    specialization: str | None = Field(default=None, max_length=255)
    experience_years: int = Field(default=0, ge=0)


class BankAccountUpsert(BaseModel):
    bank_code: str = Field(default="", max_length=20)
    bank_name: str = Field(default="", max_length=100)
    account_number: str = Field(default="", max_length=50)
    account_holder: str = Field(default="", max_length=100)


class BankAccountResponse(BaseModel):
    id: str | None = None
    technician_id: str | None = None
    bank_code: str | None = None
    bank_name: str | None = None
    account_number: str | None = None
    account_holder: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None

    class Config:
        from_attributes = True


class TechnicianUpdate(BaseModel):
    full_name: str | None = None
    phone: str | None = None
    id_card_front_url: str | None = Field(default=None, max_length=500)
    id_card_back_url: str | None = Field(default=None, max_length=500)
    certificate_url: str | None = Field(default=None, max_length=500)
    skills: str | None = None
    specialization: str | None = Field(default=None, max_length=255)
    experience_years: int | None = Field(default=None, ge=0)
    is_online: bool | None = None
    last_latitude: Decimal | None = None
    last_longitude: Decimal | None = None
    bank_account: BankAccountUpsert | None = None
    bank_code: str | None = None
    bank_name: str | None = None
    account_number: str | None = None
    account_holder: str | None = None


# Schema cho thợ tự chỉnh sửa thông tin cá nhân (không được sửa chuyên môn và kinh nghiệm)
class TechnicianSelfUpdate(BaseModel):
    full_name: str | None = None
    phone: str | None = None
    bank_account: BankAccountUpsert | None = None
    bank_code: str | None = None
    bank_name: str | None = None
    account_number: str | None = None
    account_holder: str | None = None


class TechnicianKycReview(BaseModel):
    kyc_status: str
    kyc_note: str | None = None


class TechnicianPresenceUpdate(BaseModel):
    is_online: bool
    last_latitude: Decimal | None = None
    last_longitude: Decimal | None = None


class TechnicianResponse(BaseModel):
    user_id: str
    id_card_number: str | None = None
    id_card_front: str | None = None
    id_card_back: str | None = None
    certificate_img: str | None = None
    id_card_front_url: str | None = None
    id_card_back_url: str | None = None
    certificate_url: str | None = None
    skills: str = "BOTH"
    specialization: str | None = None
    experience_years: int = 0
    kyc_status: str = "PENDING"
    kyc_reviewed_by: str | None = None
    kyc_reviewed_at: datetime | None = None
    kyc_note: str | None = None
    is_online: bool = False
    last_latitude: Decimal | None = None
    last_longitude: Decimal | None = None
    last_location_at: datetime | None = None
    rating_avg: Decimal = Decimal("5.0")
    total_jobs_done: int = 0
    created_at: datetime | None = None
    updated_at: datetime | None = None
    user: TechnicianUser | None = None
    bank_account: BankAccountResponse | None = None

    class Config:
        from_attributes = True
