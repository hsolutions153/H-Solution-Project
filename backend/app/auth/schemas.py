from pydantic import BaseModel, Field
from app.core.validation import Address, Email, InputModel, LoginPassword, Name, OptionalPhone, Password, Phone


class SignupRequest(InputModel):
    name: Name
    phone: OptionalPhone = None
    email: Email
    password: Password
    address: Address | None = None


class LoginRequest(InputModel):
    # The existing login accepts either email or Vietnamese mobile number.
    email: Email | Phone
    password: LoginPassword



class AuthenticatedUser(BaseModel):
    id: str
    name: str
    phone: str | None = None
    email: str | None = None
    address: str | None = None
    is_new_user: bool = False
    is_profile_complete: bool = True


class GoogleAuthRequest(InputModel):
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


class ForgotPasswordRequest(InputModel):
    phone: Phone


class ForgotPasswordResponse(BaseModel):
    message: str
    expires_in_seconds: int
    otp_code: str | None = None


class VerifyOtpRequest(InputModel):
    phone: Phone
    otp_code: str = Field(min_length=6, max_length=6, pattern=r"^[0-9]{6}$")


class ResetPasswordRequest(VerifyOtpRequest):
    new_password: Password


class ResetPasswordResponse(BaseModel):
    message: str
