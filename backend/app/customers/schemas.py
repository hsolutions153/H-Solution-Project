from datetime import datetime

from pydantic import BaseModel, EmailStr, Field

PHONE_PATTERN = r"^$|^0(3|5|7|8|9)\d{8}$"


class CustomerCreate(BaseModel):
    full_name: str = Field(min_length=1, max_length=100)
    phone: str | None = Field(default=None, max_length=10, pattern=PHONE_PATTERN)
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)
    address: str | None = Field(default=None, max_length=255)


class CustomerUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=1, max_length=100)
    phone: str | None = Field(default=None, max_length=10, pattern=PHONE_PATTERN)
    email: EmailStr | None = None
    address: str | None = Field(default=None, max_length=255)


class CustomerStatusUpdate(BaseModel):
    is_active: bool
    locked_reason: str | None = None


class CustomerResponse(BaseModel):
    id: str
    full_name: str
    phone: str | None = None
    email: EmailStr
    address: str | None = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CustomerListResponse(BaseModel):
    items: list[CustomerResponse]
    total: int
    page: int
    limit: int
