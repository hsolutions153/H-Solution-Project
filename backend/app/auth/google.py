import logging
import os

import jwt

from app.core.exceptions import AppException, ErrorCode

logger = logging.getLogger("h_solution")
_jwks = jwt.PyJWKClient("https://www.googleapis.com/oauth2/v3/certs", cache_keys=True)


def verify_google_id_token(id_token: str) -> dict:
    client_ids = [value.strip() for value in (
        os.getenv("GOOGLE_CLIENT_ID") or os.getenv("AUTH_GOOGLE_ID") or ""
    ).split(",") if value.strip()]
    if not client_ids:
        logger.error("[Google Auth] Missing GOOGLE_CLIENT_ID or AUTH_GOOGLE_ID in environment.")
        raise AppException(ErrorCode.SERVICE_UNAVAILABLE, message="Đăng nhập Google chưa được cấu hình.")
    try:
        key = _jwks.get_signing_key_from_jwt(id_token)
        claims = jwt.decode(
            id_token, key.key, algorithms=["RS256"], audience=client_ids,
            issuer=["accounts.google.com", "https://accounts.google.com"],
            options={"require": ["sub", "aud", "iss", "exp", "email"]},
            leeway=60,
        )
    except jwt.PyJWKClientConnectionError as error:
        logger.error(f"[Google Auth] Cannot connect to Google JWKS endpoint: {error}")
        raise AppException(ErrorCode.SERVICE_UNAVAILABLE, message="Không thể xác minh đăng nhập Google lúc này.") from error
    except jwt.PyJWTError as error:
        logger.error(f"[Google Auth] JWT decode error: {type(error).__name__} - {error}")
        raise AppException(ErrorCode.TOKEN_INVALID, message=f"Thông tin đăng nhập Google không hợp lệ hoặc đã hết hạn: {error}") from error
    if claims.get("email_verified") is not True:
        logger.warning(f"[Google Auth] Email not verified for sub {claims.get('sub')}")
        raise AppException(ErrorCode.TOKEN_INVALID, message="Email Google chưa được xác minh.")
    return claims
