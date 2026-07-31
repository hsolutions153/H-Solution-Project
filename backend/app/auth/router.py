from fastapi import APIRouter
from app.auth.schemas import UserRegister, UserLogin, TokenResponse
from app.auth.service import register_user, authenticate_user

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/signup", response_model=dict)
def register(user: UserRegister):
    return register_user(user)

@router.post("/login", response_model=TokenResponse)
def login(form_data: UserLogin):
    return authenticate_user(form_data)