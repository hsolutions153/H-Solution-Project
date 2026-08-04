from uuid import UUID

from pydantic import BaseModel, EmailStr, Field

class TechnicianCreate(BaseModel):
    full_name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    phone: str = Field(min_length=8, max_length=20)
    specialization: str = Field(min_length=1, max_length=120)

class TechnicianUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=1, max_length=120)
    email: EmailStr | None = None
    phone: str | None = Field(default=None, min_length=8, max_length=20)
    specialization: str | None = Field(default=None, min_length=1, max_length=120)

class TechnicianResponse(BaseModel):
    id: UUID
    full_name: str
    email: EmailStr
    phone: str
    specialization: str

    class Config:
        from_attributes = True
