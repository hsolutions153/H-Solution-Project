import os

import requests

from app.core.exceptions import AppException, ErrorCode


def send_password_reset_code(phone: str, code: str) -> None:
    url = os.getenv("SMS_WEBHOOK_URL")
    if not url:
        development = os.getenv("APP_ENV", "development").lower() != "production"
        if development and os.getenv("OTP_EXPOSE_IN_RESPONSE", "false").lower() == "true":
            return
        raise AppException(ErrorCode.SERVICE_UNAVAILABLE, message="Dịch vụ gửi mã xác minh chưa được cấu hình.")
    headers = {"Content-Type": "application/json"}
    token = os.getenv("SMS_WEBHOOK_TOKEN")
    if token:
        headers["Authorization"] = f"Bearer {token}"
    try:
        response = requests.post(url, headers=headers, json={
            "phone": phone, "code": code,
            "message": f"Ma xac minh V-HCare: {code}. Ma co hieu luc trong 10 phut.",
        }, timeout=10)
        response.raise_for_status()
    except requests.RequestException as error:
        raise AppException(ErrorCode.SERVICE_UNAVAILABLE, message="Không thể gửi mã xác minh. Vui lòng thử lại.") from error
