from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field


class OrderUser(BaseModel):
    id: str
    full_name: str
    phone: str | None = None


class OrderResponse(BaseModel):
    id: str
    request_code: str
    customer_id: str
    technician_id: str | None = None
    device_id: str
    issue_type: str
    issue_description: str
    location_address: str
    latitude: Decimal | None = None
    longitude: Decimal | None = None
    is_sos: bool
    status: str
    assigned_at: datetime | None = None
    created_at: datetime
    updated_at: datetime
    customer: OrderUser | None = None
    technician: OrderUser | None = None


class OrderListResponse(BaseModel):
    items: list[OrderResponse]
    total: int
    page: int
    limit: int


class AssignTechnicianRequest(BaseModel):
    technician_id: str = Field(min_length=1, max_length=10)


class AssignmentResponse(BaseModel):
    message: str
    order: OrderResponse
