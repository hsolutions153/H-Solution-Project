from fastapi import APIRouter, status

from app.auth.schemas import (
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    LoginRequest,
    ResetPasswordRequest,
    ResetPasswordResponse,
    SignupRequest,
    SignupResponse,
    TokenResponse,
)
from app.auth.service import authenticate_user, register_customer, request_password_reset, reset_password

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/signup", response_model=SignupResponse, status_code=status.HTTP_201_CREATED)
def signup(payload: SignupRequest):
    return register_customer(payload)


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest):
    return authenticate_user(str(payload.email), payload.password)


@router.post("/forgot-password", response_model=ForgotPasswordResponse)
def forgot_password(payload: ForgotPasswordRequest):
    return request_password_reset(payload.phone)


@router.post("/reset-password", response_model=ResetPasswordResponse)
def reset_user_password(payload: ResetPasswordRequest):
    return reset_password(payload.phone, payload.otp_code, payload.new_password)
