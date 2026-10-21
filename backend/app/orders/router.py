from app.core.validation import Identifier
from fastapi import APIRouter, Depends, Query

from app.auth.utils import get_current_user
from app.customers.service import require_admin
from app.orders.schemas import AssignTechnicianRequest, AssignmentResponse, CancelOrderRequest, OrderListResponse, OrderResponse, OrderStatusFilter, OrderStatusUpdate
from app.orders.service import assign_technician, cancel_order, fetch_order, fetch_orders, update_order_status
from fastapi import Body

router = APIRouter(prefix="/orders", tags=["Orders"], dependencies=[Depends(require_admin)])


@router.get("", response_model=OrderListResponse)
def get_orders(
    status: OrderStatusFilter | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=500),
):
    return fetch_orders(status, page, limit)


@router.get("/{order_id}", response_model=OrderResponse)
def get_order(order_id: Identifier):
    return fetch_order(order_id)


@router.patch("/{order_id}/assign", response_model=AssignmentResponse)
def assign_order(
    order_id: Identifier,
    data: AssignTechnicianRequest,
    current_user: dict = Depends(get_current_user),
):
    order = assign_technician(order_id, data.technician_id, current_user["sub"])
    return {"message": "Phân công kỹ thuật viên thành công", "order": order}


@router.patch("/{order_id}/cancel")
def cancel_order_endpoint(
    order_id: Identifier,
    data: CancelOrderRequest = Body(default=CancelOrderRequest()),
    current_user: dict = Depends(get_current_user),
):
    reason = data.cancel_reason or data.reason
    order = cancel_order(order_id, reason, current_user["sub"])
    return {"message": "Hủy đơn hàng thành công", "order": order}


@router.patch("/{order_id}/status")
def update_order_status_endpoint(
    order_id: Identifier,
    data: OrderStatusUpdate,
    current_user: dict = Depends(get_current_user),
):
    status = data.status
    reason = data.cancel_reason or data.reason
    order = update_order_status(order_id, status, reason, current_user["sub"])
    return {"message": "Cập nhật trạng thái đơn hàng thành công", "order": order}
