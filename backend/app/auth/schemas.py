from pydantic import BaseModel, EmailStr, Field


class SignupRequest(BaseModel):
    """Public registration: every self-registered account is a customer."""

    name: str = Field(min_length=1, max_length=100)
    phone: str | None = Field(default=None, max_length=10)
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)
    address: str | None = Field(default=None, max_length=255)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=72)


class AuthenticatedUser(BaseModel):
    id: str
    name: str
    phone: str | None = None


class SignupResponse(BaseModel):
    message: str
    user_id: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role_id: str
    role: str
    user: AuthenticatedUser


class ForgotPasswordRequest(BaseModel):
    phone: str = Field(min_length=1, max_length=20)


class ForgotPasswordResponse(BaseModel):
    message: str
    expires_in_seconds: int
    otp_code: str | None = None


class ResetPasswordRequest(BaseModel):
    phone: str = Field(min_length=1, max_length=20)
    otp_code: str = Field(min_length=6, max_length=6, pattern=r"^\d{6}$")
    new_password: str = Field(min_length=8, max_length=72)


class ResetPasswordResponse(BaseModel):
    message: str
