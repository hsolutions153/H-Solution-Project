from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field, StrictBool, model_validator
from app.core.validation import (
    AccountNumber, BankCode, Experience, Identifier, InputModel, Latitude,
    Longitude, Name, OptionalEmail, OptionalPhone, OptionalUrl, Password, Reason,
    choice, validate_coordinates,
)
from app.technicians.models import KYC_STATUSES, SKILLS

KycStatus = choice(KYC_STATUSES)
TechnicianSkill = choice(SKILLS)


class TechnicianUser(BaseModel):
    id: str
    full_name: str | None = None
    email: str | None = None
    phone: str | None = None
    avatar_url: str | None = None
    is_active: bool = True


class TechnicianCreate(InputModel):
    user_id: Identifier | None = None
    full_name: Name
    phone: OptionalPhone = None
    email: OptionalEmail = None
    password: Password | None = None
    id_card_number: str | None = Field(default=None, pattern=r"^[0-9]{12}$", max_length=12)
    id_card_front_url: OptionalUrl = None
    id_card_back_url: OptionalUrl = None
    certificate_url: OptionalUrl = None
    skills: TechnicianSkill = "BOTH"
    specialization: str | None = Field(default=None, max_length=255)
    experience_years: Experience = 0

    @model_validator(mode="after")
    def valid_new_account(self):
        if self.user_id is None and (self.phone is None or self.password is None):
            raise ValueError("Tạo tài khoản kỹ thuật viên cần số điện thoại và mật khẩu")
        return self


class BankAccountUpsert(InputModel):
    bank_code: BankCode
    bank_name: Name
    account_number: AccountNumber
    account_holder: Name


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


class TechnicianUpdate(InputModel):
    non_nullable_fields = {"full_name", "skills", "experience_years", "is_online", "id_card_front_url", "id_card_back_url", "certificate_url"}
    full_name: Name | None = None
    phone: OptionalPhone = None
    id_card_front_url: OptionalUrl = None
    id_card_back_url: OptionalUrl = None
    certificate_url: OptionalUrl = None
    skills: TechnicianSkill | None = None
    specialization: str | None = Field(default=None, max_length=255)
    experience_years: Experience | None = None
    is_online: StrictBool | None = None
    last_latitude: Latitude | None = None
    last_longitude: Longitude | None = None
    bank_account: BankAccountUpsert | None = None
    bank_code: BankCode | None = None
    bank_name: Name | None = None
    account_number: AccountNumber | None = None
    account_holder: Name | None = None

    @model_validator(mode="after")
    def valid_profile(self):
        validate_coordinates(self.last_latitude, self.last_longitude)
        validate_bank_fields(self)
        return self


# Schema cho thợ tự chỉnh sửa thông tin cá nhân (không được sửa chuyên môn và kinh nghiệm)
class TechnicianSelfUpdate(InputModel):
    non_nullable_fields = {"full_name"}
    full_name: Name | None = None
    phone: OptionalPhone = None
    bank_account: BankAccountUpsert | None = None
    bank_code: BankCode | None = None
    bank_name: Name | None = None
    account_number: AccountNumber | None = None
    account_holder: Name | None = None

    @model_validator(mode="after")
    def valid_bank(self):
        validate_bank_fields(self)
        return self


class TechnicianKycReview(InputModel):
    kyc_status: KycStatus
    kyc_note: Reason | None = None


class TechnicianPresenceUpdate(InputModel):
    is_online: StrictBool
    last_latitude: Latitude | None = None
    last_longitude: Longitude | None = None

    @model_validator(mode="after")
    def valid_presence(self):
        validate_coordinates(self.last_latitude, self.last_longitude, required=self.is_online)
        return self


def validate_bank_fields(model):
    fields = ("bank_code", "bank_name", "account_number", "account_holder")
    supplied = [key for key in fields if key in model.model_fields_set]
    if supplied:
        if "bank_account" in model.model_fields_set:
            raise ValueError("Chỉ dùng bank_account hoặc các trường ngân hàng riêng lẻ")
        values = {key: getattr(model, key) for key in fields}
        BankAccountUpsert.model_validate(values)


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
