from fastapi import APIRouter, status

from app.auth.schemas import (
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    GoogleAuthRequest,
    LoginRequest,
    ResetPasswordRequest,
    ResetPasswordResponse,
    SignupRequest,
    SignupResponse,
    TokenResponse,
    VerifyOtpRequest,
)
from app.auth.service import (
    authenticate_or_register_google_user,
    authenticate_user,
    register_customer,
    request_password_reset,
    reset_password,
    verify_password_reset_code,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/signup", response_model=SignupResponse, status_code=status.HTTP_201_CREATED)
def signup(payload: SignupRequest):
    return register_customer(payload)


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest):
    return authenticate_user(str(payload.email), payload.password)


@router.post("/google", response_model=TokenResponse)
def google_login(payload: GoogleAuthRequest):
    return authenticate_or_register_google_user(payload)


@router.post("/forgot-password", response_model=ForgotPasswordResponse)
def forgot_password(payload: ForgotPasswordRequest):
    return request_password_reset(payload.phone)


@router.post("/reset-password", response_model=ResetPasswordResponse)
def reset_user_password(payload: ResetPasswordRequest):
    return reset_password(payload.phone, payload.otp_code, payload.new_password)


@router.post("/verify-otp", response_model=ResetPasswordResponse)
def verify_otp(payload: VerifyOtpRequest):
    verify_password_reset_code(payload.phone, payload.otp_code)
    return {"message": "Mã xác minh hợp lệ"}
