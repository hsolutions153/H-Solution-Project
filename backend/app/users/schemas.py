from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class RoleResponse(BaseModel):
    id: str
    code: str
    name: str
    description: str | None = None

    class Config:
        from_attributes = True


class UserCreate(BaseModel):
    full_name: str = Field(min_length=1, max_length=100)
    phone: str | None = Field(default=None, max_length=20)
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)
    role_id: str = Field(min_length=1, max_length=10)
    address: str | None = Field(default=None, max_length=255)
    is_active: bool = True


class UserUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=1, max_length=100)
    phone: str | None = Field(default=None, max_length=20)
    email: EmailStr | None = None
    password: str | None = Field(default=None, min_length=8, max_length=72)
    role_id: str | None = Field(default=None, min_length=1, max_length=10)
    address: str | None = Field(default=None, max_length=255)
    is_active: bool | None = None
    locked_reason: str | None = None


class UserStatusUpdate(BaseModel):
    is_active: bool
    locked_reason: str | None = None


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
