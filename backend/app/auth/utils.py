import os
import jwt
import bcrypt
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv
from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.exceptions import AppException, ErrorCode

load_dotenv()

_PLACEHOLDER_SECRETS = {"super-secret-key-change-it", "change-me", "changeme", "secret", "your-secret-key"}


def _load_secret_key() -> str:
    """Không bao giờ ký token bằng khóa biết trước. Production thiếu khóa thì dừng khởi động;
    môi trường dev thiếu khóa dùng khóa ngẫu nhiên theo tiến trình (token mất hiệu lực khi restart)."""
    secret = (os.getenv("JWT_SECRET_KEY") or "").strip()
    if secret and secret not in _PLACEHOLDER_SECRETS and len(secret) >= 32:
        return secret
    if os.getenv("APP_ENV", "development").lower() == "production":
        raise RuntimeError("JWT_SECRET_KEY phải được cấu hình (>= 32 ký tự, không dùng giá trị mẫu) khi APP_ENV=production")
    import logging
    import secrets
    logging.getLogger(__name__).warning("JWT_SECRET_KEY thiếu hoặc yếu; dùng khóa ngẫu nhiên tạm thời cho môi trường dev.")
    return secrets.token_urlsafe(48)


SECRET_KEY = _load_secret_key()
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
REFRESH_TOKEN_EXPIRE_DAYS = 7
ACCESS_TOKEN_TYPE = "access-token"
REFRESH_TOKEN_TYPE = "refresh-token"

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


def password_version(password_hash: str | None) -> str:
    """Dấu vân tay ngắn của mật khẩu hiện tại; đổi mật khẩu làm access token cũ mất hiệu lực."""
    import hashlib
    return hashlib.sha256(f"{SECRET_KEY}:{password_hash or ''}".encode("utf-8")).hexdigest()[:16]


# Cache ngắn trạng thái tài khoản để không truy vấn DB ở mọi request.
_ACCOUNT_CACHE_TTL_SECONDS = 10
_account_cache: dict[str, tuple[float, dict | None]] = {}


def invalidate_account_cache(user_id: str | None = None):
    if user_id is None:
        _account_cache.clear()
    else:
        _account_cache.pop(user_id, None)


def _current_account(user_id: str) -> dict | None:
    import time
    cached = _account_cache.get(user_id)
    if cached and cached[0] > time.monotonic():
        return cached[1]
    from app.db.database import supabase
    response = (
        supabase.table("users")
        .select("id,is_active,role_id,password_hash")
        .eq("id", user_id)
        .maybe_single()
        .execute()
    )
    account = response.data if response and hasattr(response, "data") else None
    _account_cache[user_id] = (time.monotonic() + _ACCOUNT_CACHE_TTL_SECONDS, account)
    return account


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta if expires_delta else timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire, "token_type": ACCESS_TOKEN_TYPE})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token(data: dict, expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta if expires_delta else timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    )
    to_encode.update({"exp": expire, "token_type": REFRESH_TOKEN_TYPE})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def get_refresh_token_payload(token: str) -> dict:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise AppException(ErrorCode.TOKEN_EXPIRED, headers={"WWW-Authenticate": "Bearer"})
    except jwt.PyJWTError:
        raise AppException(ErrorCode.TOKEN_INVALID, headers={"WWW-Authenticate": "Bearer"})

    if payload.get("token_type") != REFRESH_TOKEN_TYPE or not payload.get("sub"):
        raise AppException(ErrorCode.TOKEN_INVALID, headers={"WWW-Authenticate": "Bearer"})
    return payload


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

    if (
        payload.get("token_type") != ACCESS_TOKEN_TYPE
        or not payload.get("sub")
        or not payload.get("role_id")
    ):
        raise AppException(
            ErrorCode.TOKEN_INVALID,
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Token chỉ chứng minh quyền lúc cấp: kiểm tra lại tài khoản còn hoạt động, đúng vai trò
    # và chưa đổi mật khẩu để khóa/hạ quyền/đổi mật khẩu có hiệu lực ngay.
    try:
        account = _current_account(payload["sub"])
    except Exception:
        raise AppException(ErrorCode.DATABASE_ERROR)
    if not account or not account.get("is_active", False):
        raise AppException(ErrorCode.USER_LOCKED, headers={"WWW-Authenticate": "Bearer"})
    if (
        account.get("role_id") != payload.get("role_id")
        or ("pwv" in payload and payload["pwv"] != password_version(account.get("password_hash")))
    ):
        raise AppException(ErrorCode.TOKEN_INVALID, headers={"WWW-Authenticate": "Bearer"})
    return payload


def require_role_ids(*allowed_role_ids: str):
    def authorize(current_user: dict = Depends(get_current_user)) -> dict:
        if current_user["role_id"] not in allowed_role_ids:
            raise AppException(ErrorCode.FORBIDDEN)
        return current_user

    return authorize
