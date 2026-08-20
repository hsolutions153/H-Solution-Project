from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.customers.service import require_admin
from app.orders.service import get_dashboard_metrics


class DashboardMetricsResponse(BaseModel):
    total_orders: int
    by_status: dict[str, int]

router = APIRouter(prefix="/dashboard", tags=["Dashboard"], dependencies=[Depends(require_admin)])

@router.get("/metrics", response_model=DashboardMetricsResponse)
def get_metrics():
    return get_dashboard_metrics()
