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
    if order.get("status") == "CANCELLED":
        raise AppException(
            ErrorCode.INVALID_STATUS_TRANSITION,
            message="Đơn hàng đã bị hủy, không thể phân công kỹ thuật viên nữa."
        )
    if order["status"] not in ASSIGNABLE_STATUSES:
        raise AppException(ErrorCode.INVALID_STATUS_TRANSITION, message="Đơn hàng này không còn ở trạng thái có thể phân công")

    technician = repository.get_technician_profile(technician_id)
    if not technician:
        raise AppException(ErrorCode.TECHNICIAN_NOT_FOUND)
    if technician["kyc_status"] != "APPROVED":
        raise AppException(ErrorCode.TECHNICIAN_NOT_KYC_APPROVED)
    if not technician.get("is_online"):
        raise AppException(ErrorCode.VALIDATION_ERROR, message="KTV chưa bật trạng thái nhận việc")

    from app.repair_requests.service import _ensure_technician_not_busy, _has_fresh_technician_location
    # Kiểm tra khả năng nhận việc ngay tại thời điểm Admin phân công.
    # Nếu để lọt bước này, KTV vẫn nhận thông báo nhưng chỉ bị từ chối muộn
    # khi bấm di chuyển, tạo ra trạng thái phân công giả.
    _ensure_technician_not_busy(technician_id, order)

    if not _has_fresh_technician_location(technician):
        raise AppException(
            ErrorCode.VALIDATION_ERROR,
            message="Trạng thái online hoặc vị trí GPS của kỹ thuật viên đã hết hạn.",
        )

    assigned_at = datetime.now(timezone.utc).isoformat()
    repository.assign_order(order_id, technician_id, assigned_at, assigned_by)
    action_note = "Quản trị viên phân công kỹ thuật viên"
    repository.add_status_history(
        {
            "id": secrets.token_hex(5).upper(),
            "repair_id": order_id,
            "status": "ASSIGNED",
            "changed_by": assigned_by,
            "note": action_note,
        }
    )
    updated_order = fetch_order(order_id)
    try:
        from app.notifications import service as notif_service
        notif_service.notify_request_assigned(updated_order, technician_id)
    except Exception as notif_err:
        import logging
        logging.getLogger("h_solution").warning(f"Failed to trigger notifications for assign_technician: {notif_err}")

    return updated_order


def get_dashboard_metrics():
    counts = Counter(order["status"] for order in repository.get_order_statuses())
    by_status = {order_status: counts[order_status] for order_status in sorted(ORDER_STATUSES)}
    return {"total_orders": sum(counts.values()), "by_status": by_status}


def cancel_order(order_id: str, reason: str | None, cancelled_by: str):
    from app.repair_requests import service as repair_service
    return repair_service.update_request_status(
        order_id,
        current_user={"sub": cancelled_by, "role": "ADMIN"},
        data={"status": "CANCELLED", "cancel_reason": reason or "Quản trị viên hủy đơn"},
    )


def update_order_status(order_id: str, status: str, reason: str | None, updated_by: str):
    from app.repair_requests import service as repair_service
    return repair_service.update_request_status(
        order_id,
        current_user={"sub": updated_by, "role": "ADMIN"},
        data={"status": status, "cancel_reason": reason},
    )
