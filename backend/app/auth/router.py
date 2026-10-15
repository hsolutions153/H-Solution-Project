import os

from fastapi import APIRouter, Request, Response, status

from app.auth.schemas import (
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    GoogleAuthRequest,
    LoginRequest,
    RefreshResponse,
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
    logout_refresh_token,
    refresh_access_token,
    register_customer,
    request_password_reset,
    reset_password,
    verify_password_reset_code,
)

from app.auth.utils import REFRESH_TOKEN_EXPIRE_DAYS
from app.core.exceptions import AppException, ErrorCode

router = APIRouter(prefix="/auth", tags=["Authentication"])

ALLOWED_COOKIE_ROLES = {"admin", "technician", "customer"}
COOKIE_SECURE = os.getenv("APP_ENV", "development").lower() == "production"
COOKIE_SAMESITE = os.getenv("REFRESH_COOKIE_SAMESITE", "lax").lower()
REFRESH_COOKIE_PATH = "/auth"


def _cookie_name(role: str) -> str:
    # Mỗi app một cookie riêng để 3 web cùng host không ghi đè nhau
    role = role.lower()
    if role not in ALLOWED_COOKIE_ROLES:
        raise AppException(ErrorCode.VALIDATION_ERROR, message="Vai trò không hợp lệ")
    return f"refresh_token_{role}"


def _set_refresh_cookie(response: Response, raw_token: str, role: str) -> None:
    response.set_cookie(
        key=_cookie_name(role),
        value=raw_token,
        max_age=REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        path=REFRESH_COOKIE_PATH,
    )


def _clear_refresh_cookie(response: Response, role: str) -> None:
    response.delete_cookie(key=_cookie_name(role), path=REFRESH_COOKIE_PATH)


@router.post("/signup", response_model=SignupResponse, status_code=status.HTTP_201_CREATED)
def signup(payload: SignupRequest):
    return register_customer(payload)


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, response: Response):
    result = authenticate_user(str(payload.email), payload.password)
    _set_refresh_cookie(response, result.pop("refresh_token"), result["role"])
    return result


@router.post("/google", response_model=TokenResponse)
def google_login(payload: GoogleAuthRequest, response: Response):
    result = authenticate_or_register_google_user(payload)
    _set_refresh_cookie(response, result.pop("refresh_token"), result["role"])
    return result


@router.post("/refresh", response_model=RefreshResponse)
def refresh(request: Request, response: Response, role: str):
    cookie_name = _cookie_name(role)
    raw_token = request.cookies.get(cookie_name)
    if not raw_token:
        raise AppException(ErrorCode.TOKEN_INVALID, headers={"WWW-Authenticate": "Bearer"})
    try:
        result = refresh_access_token(raw_token)
    except AppException:
        _clear_refresh_cookie(response, role)
        raise
    _set_refresh_cookie(response, result.pop("refresh_token"), role)
    return result


@router.post("/logout", response_model=ResetPasswordResponse)
def logout(request: Request, response: Response, role: str):
    raw_token = request.cookies.get(_cookie_name(role))
    if raw_token:
        logout_refresh_token(raw_token)
    _clear_refresh_cookie(response, role)
    return {"message": "Đăng xuất thành công"}


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
