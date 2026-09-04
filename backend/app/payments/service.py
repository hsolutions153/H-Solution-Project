import hashlib
import hmac
import os
import secrets
import uuid
from datetime import datetime, timezone
from urllib.parse import urlencode

import requests
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


def fetch_qr(repair_id: str, current_user: dict, payment_method: str = "BANK_TRANSFER"):
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
    if not amount or float(amount) <= 0:
        quote = repository.get_accepted_quote(repair_id)
        if quote:
            amount = quote["estimated_price"]
        else:
            # Fallback to latest quote for this repair request
            try:
                from app.db.database import supabase
                from app.payments.models import REPAIR_QUOTES_TABLE
                q_res = supabase.table(REPAIR_QUOTES_TABLE).select("estimated_price").eq("repair_id", repair_id).limit(1).execute()
                if q_res and q_res.data and len(q_res.data) > 0:
                    amount = q_res.data[0]["estimated_price"]
            except Exception:
                pass

    if not amount or float(amount) <= 0:
        amount = 250000  # Default minimum service fee fallback

    if payment:
        updated_fields = {"amount": str(amount), "payment_method": payment_method}
        repository.update_payment(payment["id"], updated_fields)
        payment.update(updated_fields)
    else:
        payment_id = _payment_id()
        payment = repository.create_payment({
            "id": payment_id,
            "repair_id": repair_id,
            "payment_code": _payment_code(),
            "amount": str(amount),
            "currency": "VND",
            "payment_method": payment_method,
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


def create_momo_payment(repair_id: str, current_user: dict, request_type: str = "payWithATM"):
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

    amount = repair.get("total_amount")
    if not amount or float(amount) <= 0:
        quote = repository.get_accepted_quote(repair_id)
        if quote:
            amount = quote["estimated_price"]
        else:
            try:
                from app.db.database import supabase
                from app.payments.models import REPAIR_QUOTES_TABLE
                q_res = supabase.table(REPAIR_QUOTES_TABLE).select("estimated_price").eq("repair_id", repair_id).limit(1).execute()
                if q_res and q_res.data and len(q_res.data) > 0:
                    amount = q_res.data[0]["estimated_price"]
            except Exception:
                pass

    if not amount or float(amount) <= 0:
        amount = 250000

    int_amount = int(float(str(amount)))

    payment = repository.get_payment_by_repair_id(repair_id)
    if payment:
        repository.update_payment(payment["id"], {"amount": str(int_amount), "payment_method": "MOMO_ATM"})
    else:
        payment_id = _payment_id()
        payment = repository.create_payment({
            "id": payment_id,
            "repair_id": repair_id,
            "payment_code": _payment_code(),
            "amount": str(int_amount),
            "currency": "VND",
            "payment_method": "MOMO_ATM",
            "payment_status": "UNPAID",
            "created_by": current_user["sub"],
            "updated_by": current_user["sub"],
        })

    partner_code = os.getenv("MOMO_PARTNER_CODE", "MOMO")
    access_key = os.getenv("MOMO_ACCESS_KEY", "F8BBA842ECF85")
    secret_key = os.getenv("MOMO_SECRET_KEY", "K971N52YBDHBRh3K")
    endpoint = os.getenv("MOMO_API_URL", "https://test-payment.momo.vn/v2/gateway/api/create")

    order_id = f"HS_{repair_id[:8]}_{int(datetime.now().timestamp())}"
    request_id = str(uuid.uuid4())
    order_info = f"Thanh toan don sua chua #{repair_id[:8]}"
    redirect_url = f"http://localhost:3000/home/history/{repair_id}"
    ipn_url = "http://localhost:8000/api/payments/webhook/momo"
    amount_str = str(int_amount)
    extra_data = ""

    raw_signature = (
        f"accessKey={access_key}"
        f"&amount={amount_str}"
        f"&extraData={extra_data}"
        f"&ipnUrl={ipn_url}"
        f"&orderId={order_id}"
        f"&orderInfo={order_info}"
        f"&partnerCode={partner_code}"
        f"&redirectUrl={redirect_url}"
        f"&requestId={request_id}"
        f"&requestType={request_type}"
    )

    signature = hmac.new(
        secret_key.encode("utf-8"),
        raw_signature.encode("utf-8"),
        hashlib.sha256
    ).hexdigest()

    payload = {
        "partnerCode": partner_code,
        "partnerName": "H-Solution",
        "storeId": "H-Solution",
        "requestId": request_id,
        "amount": int_amount,
        "orderId": order_id,
        "orderInfo": order_info,
        "redirectUrl": redirect_url,
        "ipnUrl": ipn_url,
        "lang": "vi",
        "requestType": request_type,
        "autoCapture": True,
        "extraData": extra_data,
        "signature": signature
    }

    try:
        res = requests.post(endpoint, json=payload, headers={"Content-Type": "application/json"}, timeout=8)
        res_data = res.json()
        if res_data.get("resultCode") == 0 and res_data.get("payUrl"):
            return {
                "success": True,
                "pay_url": res_data["payUrl"],
                "qr_code_url": res_data.get("qrCodeUrl") or f"https://api.qrserver.com/v1/create-qr-code/?size=250x250&data={res_data['payUrl']}",
                "order_id": order_id,
                "amount": float(int_amount),
            }
    except Exception as e:
        print("MoMo API call error:", e)

    sim_pay_url = f"https://test-payment.momo.vn/v2/gateway/pay?partnerCode=MOMO&orderId={order_id}&amount={amount_str}&requestType={request_type}"
    sim_qr_url = f"https://api.qrserver.com/v1/create-qr-code/?size=250x250&data={sim_pay_url}"

    return {
        "success": True,
        "pay_url": sim_pay_url,
        "qr_code_url": sim_qr_url,
        "order_id": order_id,
        "amount": float(int_amount),
    }


def confirm_momo_payment(repair_id: str, current_user: dict):
    repair = repository.get_repair_request(repair_id)
    if not repair:
        raise AppException(ErrorCode.REQUEST_NOT_FOUND)

    payment = repository.get_payment_by_repair_id(repair_id)
    now = datetime.now(timezone.utc).isoformat()

    if payment:
        repository.update_payment(payment["id"], {
            "payment_status": "PAID",
            "transaction_code": f"MOMO_ATM_{int(datetime.now().timestamp())}",
            "paid_at": now,
            "updated_by": current_user["sub"],
        })

    repository.update_repair_payment_info(repair_id, {
        "status": "COMPLETED",
        "updated_by": current_user["sub"],
    })

    return {"success": True, "status": "COMPLETED"}
