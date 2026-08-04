from fastapi import APIRouter
from pydantic import BaseModel
from app.auth import service

router = APIRouter(prefix="/auth", tags=["Authentication"])

class RegisterRequest(BaseModel):
    id: str
    role_id: str
    full_name: str
    phone: str | None = None
    email: str
    password: str
    address: str | None = None

class LoginRequest(BaseModel):
    email: str
    password: str

@router.post("/signup")
def register(payload: RegisterRequest):
    # Đưa password từ payload vào trường password_hash để service xử lý băm
    user_data = payload.dict()
    user_data["password_hash"] = user_data.pop("password") 
    return service.register_user(user_data)

@router.post("/login")
def login(payload: LoginRequest):
    return service.authenticate_user(payload.email, payload.password)