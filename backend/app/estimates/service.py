from datetime import datetime, timezone
from decimal import Decimal
import secrets

from app.auth import repository as auth_repository
from app.core.exceptions import AppException, ErrorCode
from app.customers.models import ADMIN_ROLE_CODE, CUSTOMER_ROLE_CODE
from app.estimates import repository
from app.estimates.models import ITEM_TYPES, SEVERITY_TYPES
from app.repair_requests.models import TECHNICIAN_ROLE_CODE


def _generate_id() -> str:
    return secrets.token_hex(5).upper()


def _role_id(code: str) -> str:
    role = auth_repository.get_role_by_code(code)
    if not role:
        raise AppException(ErrorCode.ROLE_NOT_CONFIGURED)
    return role[0]["id"] if isinstance(role, list) else role["id"]


def _is_role(current_user: dict, code: str) -> bool:
    if current_user.get("role") == code:
        return True
    try:
        return current_user.get("role_id") == _role_id(code)
    except Exception:
        return False


def _build_estimate_response(quote: dict) -> dict:
    items = repository.get_quote_items(quote["id"])
    quote_data = dict(quote)
    quote_data["items"] = items
    return quote_data


def create_estimate(current_user: dict, data):
    request = repository.get_repair_request_by_id(data.repair_id)
    if not request:
        raise AppException(ErrorCode.REQUEST_NOT_FOUND)

    # Chi ky thuat vien duoc phan cong moi duoc tao bao gia
    is_assigned_tech = (
        _is_role(current_user, TECHNICIAN_ROLE_CODE)
        and request.get("technician_id") == current_user["sub"]
    )
    if not is_assigned_tech and not _is_role(current_user, ADMIN_ROLE_CODE):
        raise AppException(ErrorCode.FORBIDDEN)

    severity = (data.severity or "MINOR").upper()
    if severity not in SEVERITY_TYPES:
        raise AppException(ErrorCode.VALIDATION_ERROR, message="Mức độ hư hỏng không hợp lệ (MINOR hoặc MAJOR)")

    # Tinh tong tien phu tung
    parts_cost = Decimal("0")
    for item in data.items:
        item_type = (item.item_type or "SPARE_PART").upper()
        if item_type not in ITEM_TYPES:
            raise AppException(ErrorCode.VALIDATION_ERROR, message=f"Loại mục {item.item_name} không hợp lệ")
        parts_cost += Decimal(str(item.quantity)) * Decimal(str(item.unit_price))

    labor_fee = Decimal(str(data.labor_fee or 0))
    estimated_price = labor_fee + parts_cost

    now = datetime.now(timezone.utc).isoformat()
    quote_id = _generate_id()

    # Luu thong tin bao gia
    quote_record = {
        "id": quote_id,
        "repair_id": data.repair_id,
        "diagnosis_note": data.diagnosis_note,
        "severity": severity,
        "labor_fee": float(labor_fee),
        "parts_cost": float(parts_cost),
        "estimated_price": float(estimated_price),
        "status": "PENDING",
        "created_at": now,
        "created_by": current_user["sub"],
        "updated_at": now,
        "updated_by": current_user["sub"],
    }
    created_quote = repository.create_quote(quote_record)
    if not created_quote:
        raise AppException(ErrorCode.INTERNAL_SERVER_ERROR)

    # Luu chi tiet tung linh kien
    for item in data.items:
        repository.create_quote_item({
            "id": _generate_id(),
            "quote_id": quote_id,
            "item_name": item.item_name,
            "item_type": (item.item_type or "SPARE_PART").upper(),
            "quantity": float(item.quantity),
            "unit_price": float(item.unit_price),
            "note": item.note,
            "created_at": now,
            "created_by": current_user["sub"],
            "updated_at": now,
            "updated_by": current_user["sub"],
        })

    # Ghi lich su bao gia
    repository.add_quote_history({
        "id": _generate_id(),
        "quote_id": quote_id,
        "action": "CREATED",
        "changed_by": current_user["sub"],
        "note": "Kỹ thuật viên lập báo giá",
        "created_at": now,
    })

    # Cap nhat don sang trang thai cho khach duyet
    repository.update_repair_request(data.repair_id, {
        "status": "WAITING_FOR_APPROVAL",
        "diagnosed_at": now,
        "total_amount": float(estimated_price),
        "updated_at": now,
        "updated_by": current_user["sub"],
    })

    repository.add_status_history({
        "id": _generate_id(),
        "repair_id": data.repair_id,
        "status": "WAITING_FOR_APPROVAL",
        "changed_by": current_user["sub"],
        "note": "Kỹ thuật viên gửi báo giá chờ khách hàng duyệt",
        "changed_at": now,
    })

    return _build_estimate_response(created_quote)


def approve_or_reject_estimate(quote_id: str, current_user: dict, data):
    quote = repository.get_quote_by_id(quote_id)
    if not quote:
        raise AppException(ErrorCode.QUOTE_NOT_FOUND)

    request = repository.get_repair_request_by_id(quote["repair_id"])
    if not request:
        raise AppException(ErrorCode.REQUEST_NOT_FOUND)

    # Chi khach hang so huu don hoac Admin moi duoc duyet gia
    is_owner = (
        _is_role(current_user, CUSTOMER_ROLE_CODE)
        and request["customer_id"] == current_user["sub"]
    )
    if not is_owner and not _is_role(current_user, ADMIN_ROLE_CODE):
        raise AppException(ErrorCode.FORBIDDEN)

    if quote["status"] in {"ACCEPTED", "REJECTED"}:
        raise AppException(ErrorCode.QUOTE_ALREADY_DECIDED)

    action = (data.action or "").upper()
    now = datetime.now(timezone.utc).isoformat()

    if action == "APPROVE":
        new_quote_status = "ACCEPTED"
        new_request_status = "ESTIMATE_APPROVED"
        reject_reason = None
        history_note = "Khách hàng đồng ý duyệt báo giá"
    elif action == "REJECT":
        new_quote_status = "REJECTED"
        new_request_status = "ESTIMATE_REJECTED"
        reject_reason = data.rejection_reason
        history_note = f"Khách hàng từ chối báo giá. Lý do: {reject_reason or 'Không có'}"
    else:
        raise AppException(ErrorCode.VALIDATION_ERROR, message="Hành động chỉ chấp nhận APPROVE hoặc REJECT")

    # Cap nhat trang thai bao gia
    updated_quote = repository.update_quote(quote_id, {
        "status": new_quote_status,
        "reject_reason": reject_reason,
        "replied_by": current_user["sub"],
        "replied_at": now,
        "updated_at": now,
        "updated_by": current_user["sub"],
    })

    repository.add_quote_history({
        "id": _generate_id(),
        "quote_id": quote_id,
        "action": new_quote_status,
        "changed_by": current_user["sub"],
        "note": history_note,
        "created_at": now,
    })

    # Dong bo trang thai don sua chua
    repository.update_repair_request(quote["repair_id"], {
        "status": new_request_status,
        "updated_at": now,
        "updated_by": current_user["sub"],
    })

    repository.add_status_history({
        "id": _generate_id(),
        "repair_id": quote["repair_id"],
        "status": new_request_status,
        "changed_by": current_user["sub"],
        "note": history_note,
        "changed_at": now,
    })

    return _build_estimate_response(updated_quote)


def fetch_estimate_by_id(quote_id: str, current_user: dict):
    quote = repository.get_quote_by_id(quote_id)
    if not quote:
        raise AppException(ErrorCode.QUOTE_NOT_FOUND)

    request = repository.get_repair_request_by_id(quote["repair_id"])
    if not request:
        raise AppException(ErrorCode.REQUEST_NOT_FOUND)

    can_view = (
        _is_role(current_user, ADMIN_ROLE_CODE)
        or (_is_role(current_user, CUSTOMER_ROLE_CODE) and request["customer_id"] == current_user["sub"])
        or (_is_role(current_user, TECHNICIAN_ROLE_CODE) and request.get("technician_id") == current_user["sub"])
    )
    if not can_view:
        raise AppException(ErrorCode.FORBIDDEN)

    return _build_estimate_response(quote)


def fetch_estimate_by_repair_id(repair_id: str, current_user: dict):
    quote = repository.get_quote_by_repair_id(repair_id)
    if not quote:
        raise AppException(ErrorCode.QUOTE_NOT_FOUND)

    request = repository.get_repair_request_by_id(repair_id)
    if not request:
        raise AppException(ErrorCode.REQUEST_NOT_FOUND)

    can_view = (
        _is_role(current_user, ADMIN_ROLE_CODE)
        or (_is_role(current_user, CUSTOMER_ROLE_CODE) and request["customer_id"] == current_user["sub"])
        or (_is_role(current_user, TECHNICIAN_ROLE_CODE) and request.get("technician_id") == current_user["sub"])
    )
    if not can_view:
        raise AppException(ErrorCode.FORBIDDEN)

    return _build_estimate_response(quote)
