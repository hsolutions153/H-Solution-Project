from collections import Counter
from datetime import datetime, timezone
import secrets

from fastapi import HTTPException, status

from app.orders.models import ASSIGNABLE_STATUSES, ORDER_STATUSES
from app.orders import repository


def fetch_orders(order_status: str | None, page: int, limit: int):
    if order_status and order_status not in ORDER_STATUSES:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid order status")
    items, total = repository.get_orders(order_status=order_status, page=page, limit=limit)
    return {"items": items, "total": total, "page": page, "limit": limit}


def fetch_order(order_id: str):
    order = repository.get_order_by_id(order_id)
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    return order


def assign_technician(order_id: str, technician_id: str, assigned_by: str):
    order = fetch_order(order_id)
    if order["status"] not in ASSIGNABLE_STATUSES:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Order can no longer be assigned")

    technician = repository.get_technician_profile(technician_id)
    if not technician:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Technician not found")
    if technician["kyc_status"] != "APPROVED":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Technician KYC is not approved")

    assigned_at = datetime.now(timezone.utc).isoformat()
    repository.assign_order(order_id, technician_id, assigned_at)
    repository.add_status_history(
        {
            "id": secrets.token_hex(5).upper(),
            "repair_id": order_id,
            "old_status": order["status"],
            "new_status": "ASSIGNED",
            "changed_by": assigned_by,
            "api_endpoint": f"/api/v1/orders/{order_id}/assign",
            "note": "Technician assigned by admin",
        }
    )
    return fetch_order(order_id)


def get_dashboard_metrics():
    counts = Counter(order["status"] for order in repository.get_order_statuses())
    by_status = {order_status: counts[order_status] for order_status in sorted(ORDER_STATUSES)}
    return {"total_orders": sum(counts.values()), "by_status": by_status}
