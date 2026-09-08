import os
import jwt
import bcrypt
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv
from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.exceptions import AppException, ErrorCode

load_dotenv()

SECRET_KEY = os.getenv("JWT_SECRET_KEY", "super-secret-key-change-it")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24

bearer_scheme = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    password_bytes = password.encode("utf-8")
    if len(password_bytes) > 72:
        raise AppException(ErrorCode.VALIDATION_ERROR, message="Mật khẩu không được vượt quá 72 ký tự")
    return bcrypt.hashpw(password_bytes, bcrypt.gensalt()).decode("utf-8")



def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except (ValueError, TypeError):
        return False


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta if expires_delta else timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> dict:
    if not credentials:
        raise AppException(
            ErrorCode.UNAUTHORIZED,
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise AppException(
            ErrorCode.TOKEN_EXPIRED,
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.PyJWTError:
        raise AppException(
            ErrorCode.TOKEN_INVALID,
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not payload.get("sub") or not payload.get("role_id"):
        raise AppException(
            ErrorCode.TOKEN_INVALID,
            headers={"WWW-Authenticate": "Bearer"},
        )
    return payload


def require_role_ids(*allowed_role_ids: str):
    def authorize(current_user: dict = Depends(get_current_user)) -> dict:
        if current_user["role_id"] not in allowed_role_ids:
            raise AppException(ErrorCode.FORBIDDEN)
        return current_user

    return authorize
