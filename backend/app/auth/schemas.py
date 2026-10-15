from pydantic import BaseModel, EmailStr, Field

PHONE_PATTERN = r"^$|^0(3|5|7|8|9)\d{8}$"


class SignupRequest(BaseModel):
    """Public registration: every self-registered account is a customer."""

    name: str = Field(min_length=1, max_length=100)
    phone: str | None = Field(default=None, max_length=10, pattern=PHONE_PATTERN)
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)
    address: str | None = Field(default=None, max_length=255)


class LoginRequest(BaseModel):
    email: str = Field(min_length=1, max_length=100)
    password: str = Field(min_length=1, max_length=72)



class AuthenticatedUser(BaseModel):
    id: str
    name: str
    phone: str | None = None
    email: str | None = None
    address: str | None = None
    is_new_user: bool = False
    is_profile_complete: bool = True


class GoogleAuthRequest(BaseModel):
    id_token: str = Field(min_length=1, max_length=10000)


class SignupResponse(BaseModel):
    message: str
    user_id: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role_id: str
    role: str
    user: AuthenticatedUser
    is_new_user: bool = False
    is_profile_complete: bool = True


class RefreshResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class ForgotPasswordRequest(BaseModel):
    phone: str = Field(pattern=r"^0(3|5|7|8|9)\d{8}$")


class ForgotPasswordResponse(BaseModel):
    message: str
    expires_in_seconds: int
    otp_code: str | None = None


class VerifyOtpRequest(BaseModel):
    phone: str = Field(pattern=r"^0(3|5|7|8|9)\d{8}$")
    otp_code: str = Field(min_length=6, max_length=6, pattern=r"^\d{6}$")


class ResetPasswordRequest(VerifyOtpRequest):
    new_password: str = Field(min_length=8, max_length=72)


class ResetPasswordResponse(BaseModel):
    message: str
