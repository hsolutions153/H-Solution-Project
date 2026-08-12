from fastapi import APIRouter, Depends, Query

from app.auth.utils import get_current_user
from app.customers.service import require_admin
from app.orders.schemas import AssignTechnicianRequest, AssignmentResponse, OrderListResponse, OrderResponse
from app.orders.service import assign_technician, fetch_order, fetch_orders

router = APIRouter(prefix="/orders", tags=["Orders"], dependencies=[Depends(require_admin)])


@router.get("", response_model=OrderListResponse)
def get_orders(
    status: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
):
    return fetch_orders(status, page, limit)


@router.get("/{order_id}", response_model=OrderResponse)
def get_order(order_id: str):
    return fetch_order(order_id)


@router.patch("/{order_id}/assign", response_model=AssignmentResponse)
def assign_order(
    order_id: str,
    data: AssignTechnicianRequest,
    current_user: dict = Depends(get_current_user),
):
    order = assign_technician(order_id, data.technician_id, current_user["sub"])
    return {"message": "Technician assigned successfully", "order": order}
