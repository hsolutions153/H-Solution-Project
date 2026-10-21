from datetime import datetime

from pydantic import BaseModel, EmailStr, StrictBool
from app.core.validation import Address, Email, InputModel, Name, OptionalPhone, Password, Reason


class CustomerCreate(InputModel):
    full_name: Name
    phone: OptionalPhone = None
    email: Email
    password: Password
    address: Address | None = None


class CustomerUpdate(InputModel):
    non_nullable_fields = {"full_name", "email"}
    full_name: Name | None = None
    phone: OptionalPhone = None
    email: Email | None = None
    address: Address | None = None


class CustomerStatusUpdate(InputModel):
    is_active: StrictBool
    locked_reason: Reason | None = None


class CustomerResponse(BaseModel):
    id: str
    full_name: str
    phone: str | None = None
    email: EmailStr
    address: str | None = None
    avatar_url: str | None = None
    is_active: bool
    is_profile_complete: bool = True
    device_count: int = 0
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CustomerListResponse(BaseModel):
    items: list[CustomerResponse]
    total: int
    page: int
    limit: int
