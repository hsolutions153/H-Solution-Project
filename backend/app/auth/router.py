from fastapi import APIRouter, status

from app.auth.schemas import LoginRequest, SignupRequest, SignupResponse, TokenResponse
from app.auth.service import authenticate_user, register_customer

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/signup", response_model=SignupResponse, status_code=status.HTTP_201_CREATED)
def signup(payload: SignupRequest):
    return register_customer(payload)


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest):
    return authenticate_user(str(payload.email), payload.password)
