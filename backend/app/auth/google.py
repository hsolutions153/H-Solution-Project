import os

import jwt

from app.core.exceptions import AppException, ErrorCode

_jwks = jwt.PyJWKClient("https://www.googleapis.com/oauth2/v3/certs", cache_keys=True)


def verify_google_id_token(id_token: str) -> dict:
    client_ids = [value.strip() for value in (
        os.getenv("GOOGLE_CLIENT_ID") or os.getenv("AUTH_GOOGLE_ID") or ""
    ).split(",") if value.strip()]
    if not client_ids:
        raise AppException(ErrorCode.SERVICE_UNAVAILABLE, message="Đăng nhập Google chưa được cấu hình.")
    try:
        key = _jwks.get_signing_key_from_jwt(id_token)
        claims = jwt.decode(
            id_token, key.key, algorithms=["RS256"], audience=client_ids,
            issuer=["accounts.google.com", "https://accounts.google.com"],
            options={"require": ["sub", "aud", "iss", "exp", "email"]},
        )
    except jwt.PyJWKClientConnectionError as error:
        raise AppException(ErrorCode.SERVICE_UNAVAILABLE, message="Không thể xác minh đăng nhập Google lúc này.") from error
    except jwt.PyJWTError as error:
        raise AppException(ErrorCode.TOKEN_INVALID, message="Thông tin đăng nhập Google không hợp lệ hoặc đã hết hạn.") from error
    if claims.get("email_verified") is not True:
        raise AppException(ErrorCode.TOKEN_INVALID, message="Email Google chưa được xác minh.")
    return claims
