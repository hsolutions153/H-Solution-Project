import os
import secrets
from datetime import datetime, timezone
from urllib.parse import urlencode

from app.auth import repository as auth_repository
from app.core.exceptions import AppException, ErrorCode
from app.customers.models import ADMIN_ROLE_CODE, CUSTOMER_ROLE_CODE
from app.payments import repository
from app.repair_requests.models import TECHNICIAN_ROLE_CODE

PAYMENT_CODE_PREFIX = os.getenv("PAYMENT_CODE_PREFIX")
SEPAY_BANK_ACCOUNT = os.getenv("SEPAY_BANK_ACCOUNT")
SEPAY_BANK_NAME = os.getenv("SEPAY_BANK_NAME")
SEPAY_API_KEY = os.getenv("SEPAY_API_KEY")
SEPAY_QR_BASE_URL = "https://qr.sepay.vn/img"


def _payment_id() -> str:
    return secrets.token_hex(5).upper()


def _payment_code() -> str:
    return f"{PAYMENT_CODE_PREFIX}{secrets.token_hex(4).upper()}"


def _role_id(code: str) -> str:
    role = auth_repository.get_role_by_code(code)
    if not role:
        raise AppException(ErrorCode.ROLE_NOT_CONFIGURED)
    return role["id"]


def _is_role(current_user: dict, code: str) -> bool:
    if current_user.get("role") == code:
        return True
    try:
        return current_user.get("role_id") == _role_id(code)
    except Exception:
        return False


def build_qr_url(payment_code: str, amount: int) -> str:
    params = {
        "acc": SEPAY_BANK_ACCOUNT,
        "bank": SEPAY_BANK_NAME,
        "amount": amount,
        "des": payment_code,
        "template": "compact",
    }
    return f"{SEPAY_QR_BASE_URL}?{urlencode(params)}"


def fetch_qr(repair_id: str, current_user: dict):
    repair = repository.get_repair_request(repair_id)
    if not repair:
        raise AppException(ErrorCode.REQUEST_NOT_FOUND)

    is_admin = _is_role(current_user, ADMIN_ROLE_CODE)
    is_customer_owner = (
        _is_role(current_user, CUSTOMER_ROLE_CODE)
        and repair["customer_id"] == current_user["sub"]
    )
    is_assigned_technician = (
        _is_role(current_user, TECHNICIAN_ROLE_CODE)
        and repair.get("technician_id") == current_user["sub"]
    )
    if not (is_admin or is_customer_owner or is_assigned_technician):
        raise AppException(ErrorCode.FORBIDDEN)

    payment = repository.get_payment_by_repair_id(repair_id)
    if payment and payment.get("payment_status") == "PAID":
        raise AppException(ErrorCode.PAYMENT_ALREADY_PAID)

    amount = repair.get("total_amount")
    if not amount:
        quote = repository.get_accepted_quote(repair_id)
        if not quote:
            raise AppException(ErrorCode.PAYMENT_AMOUNT_UNDETERMINED)
        amount = quote["estimated_price"]

    if not payment:
        payment_id = _payment_id()
        payment = repository.create_payment({
            "id": payment_id,
            "repair_id": repair_id,
            "payment_code": _payment_code(),
            "amount": str(amount),
            "currency": "VND",
            "payment_method": "BANK_TRANSFER",
            "payment_status": "UNPAID",
            "created_by": current_user["sub"],
            "updated_by": current_user["sub"],
        })
        if not payment:
            raise AppException(ErrorCode.INTERNAL_SERVER_ERROR)
        repository.add_payment_history({
            "id": _payment_id(),
            "payment_id": payment_id,
            "action": "CREATED",
            "old_status": None,
            "new_status": "UNPAID",
            "amount": str(amount),
            "changed_by": current_user["sub"],
        })

    qr_url = build_qr_url(payment["payment_code"], int(float(str(amount))))
    return {"payment": payment, "qr_url": qr_url}


def handle_sepay_webhook(payload, auth_header: str | None):
    if not auth_header or not auth_header.startswith("Apikey "):
        raise AppException(ErrorCode.PAYMENT_WEBHOOK_UNAUTHORIZED)
    provided_key = auth_header[len("Apikey "):]
    if not SEPAY_API_KEY or not secrets.compare_digest(provided_key, SEPAY_API_KEY):
        raise AppException(ErrorCode.PAYMENT_WEBHOOK_UNAUTHORIZED)

    if payload.transferType and payload.transferType != "in":
        return {"success": True}

    target_code = payload.code.strip() if payload.code else None
    payment = None

    if target_code:
        payment = repository.get_payment_by_code(target_code)

    if not payment:
        search_texts = [payload.content, payload.description]
        for text in search_texts:
            if not text:
                continue
            words = text.replace("-", " ").replace("_", " ").split()
            for word in words:
                clean_word = word.strip().upper()
                if clean_word.startswith(PAYMENT_CODE_PREFIX or "HS"):
                    candidate = repository.get_payment_by_code(clean_word)
                    if candidate:
                        payment = candidate
                        break
            if payment:
                break

    if not payment:
        return {"success": True}

    if payment["payment_status"] == "PAID":
        return {"success": True}

    now = datetime.now(timezone.utc).isoformat()
    old_status = payment["payment_status"]

    repository.update_payment(payment["id"], {
        "payment_status": "PAID",
        "transaction_code": payload.referenceCode,
        "paid_at": now,
        "updated_by": "SYSTEM",
    })
    repository.add_payment_history({
        "id": _payment_id(),
        "payment_id": payment["id"],
        "action": "PAID",
        "old_status": old_status,
        "new_status": "PAID",
        "amount": str(payment["amount"]),
        "transaction_code": payload.referenceCode,
        "changed_by": None,
    })
    repository.update_repair_payment_info(payment["repair_id"], {
        "total_amount": str(payment["amount"]),
        "updated_by": "SYSTEM",
    })

    return {"success": True}
