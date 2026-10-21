from datetime import datetime

from pydantic import BaseModel, EmailStr, StrictBool
from app.core.validation import Address, Email, Identifier, InputModel, Name, OptionalPhone, Password, Reason


class RoleResponse(BaseModel):
    id: str
    code: str
    name: str
    description: str | None = None

    class Config:
        from_attributes = True


class UserCreate(InputModel):
    full_name: Name
    phone: OptionalPhone = None
    email: Email
    password: Password
    role_id: Identifier
    address: Address | None = None
    is_active: StrictBool = True


class UserUpdate(InputModel):
    non_nullable_fields = {"full_name", "email", "password", "role_id", "is_active"}
    full_name: Name | None = None
    phone: OptionalPhone = None
    email: Email | None = None
    password: Password | None = None
    role_id: Identifier | None = None
    address: Address | None = None
    is_active: StrictBool | None = None
    locked_reason: Reason | None = None


class UserStatusUpdate(InputModel):
    is_active: StrictBool
    locked_reason: Reason | None = None


class UserResponse(BaseModel):
    id: str
    role_id: str
    full_name: str
    phone: str | None = None
    email: EmailStr
    address: str | None = None
    is_active: bool
    is_online: bool
    locked_reason: str | None = None
    created_at: datetime
    updated_at: datetime
    role: RoleResponse | None = None

    class Config:
        from_attributes = True


class UserListResponse(BaseModel):
    items: list[UserResponse]
    total: int
    page: int
    limit: int


class RoleListResponse(BaseModel):
    items: list[RoleResponse]
