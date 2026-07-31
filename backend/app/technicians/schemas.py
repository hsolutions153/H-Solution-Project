from pydantic import BaseModel, EmailStr
from typing import Optional

class TechnicianCreate(BaseModel):
    full_name: str
    email: EmailStr
    phone: str
    specialization: str

class TechnicianUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    specialization: Optional[str] = None

class TechnicianResponse(BaseModel):
    id: int
    full_name: str
    email: EmailStr
    phone: str
    specialization: str

    class Config:
        from_attributes = True