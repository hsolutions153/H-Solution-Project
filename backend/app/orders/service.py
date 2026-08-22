import secrets
from collections import Counter
from datetime import datetime, timezone

from app.core.exceptions import AppException, ErrorCode
from app.orders import repository
from app.orders.models import ASSIGNABLE_STATUSES, ORDER_STATUSES


def fetch_orders(order_status: str | None, page: int, limit: int):
    if order_status and order_status not in ORDER_STATUSES:
        raise AppException(ErrorCode.VALIDATION_ERROR, message="Trạng thái đơn hàng không hợp lệ")
    items, total = repository.get_orders(order_status=order_status, page=page, limit=limit)
    return {"items": items, "total": total, "page": page, "limit": limit}


def fetch_order(order_id: str):
    order = repository.get_order_by_id(order_id)
    if not order:
        raise AppException(ErrorCode.REQUEST_NOT_FOUND)
    return order


def assign_technician(order_id: str, technician_id: str, assigned_by: str):
    order = fetch_order(order_id)
    if order["status"] not in ASSIGNABLE_STATUSES:
        raise AppException(ErrorCode.INVALID_STATUS_TRANSITION, message="Đơn hàng này không còn ở trạng thái có thể phân công")

    technician = repository.get_technician_profile(technician_id)
    if not technician:
        raise AppException(ErrorCode.TECHNICIAN_NOT_FOUND)
    if technician["kyc_status"] != "APPROVED":
        raise AppException(ErrorCode.TECHNICIAN_NOT_KYC_APPROVED)

    assigned_at = datetime.now(timezone.utc).isoformat()
    repository.assign_order(order_id, technician_id, assigned_at)
    repository.add_status_history(
        {
            "id": secrets.token_hex(5).upper(),
            "repair_id": order_id,
            "status": "ASSIGNED",
            "changed_by": assigned_by,
            "note": "Quản trị viên phân công kỹ thuật viên",
        }
    )
    return fetch_order(order_id)


def get_dashboard_metrics():
    counts = Counter(order["status"] for order in repository.get_order_statuses())
    by_status = {order_status: counts[order_status] for order_status in sorted(ORDER_STATUSES)}
    return {"total_orders": sum(counts.values()), "by_status": by_status}
