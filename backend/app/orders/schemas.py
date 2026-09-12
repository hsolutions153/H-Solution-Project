from datetime import datetime
from decimal import Decimal
from typing import Any

from pydantic import BaseModel, Field


class OrderUser(BaseModel):
    id: str
    full_name: str
    phone: str | None = None


class OrderImage(BaseModel):
    id: str | None = None
    image_url: str
    image_type: str | None = "BEFORE_REPAIR"
    description: str | None = None


class OrderDevice(BaseModel):
    id: str | None = None
    device_type: str | None = None
    manufacturer: str | None = None
    model_name: str | None = None
    serial_number: str | None = None


class OrderResponse(BaseModel):
    id: str
    request_code: str
    customer_id: str
    technician_id: str | None = None
    device_id: str | None = None
    issue_type: str | None = None
    issue_description: str | None = None
    location_address: str | None = None
    latitude: Decimal | float | None = None
    longitude: Decimal | float | None = None
    is_sos: bool = False
    status: str
    assigned_at: datetime | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None
    customer: OrderUser | None = None
    technician: OrderUser | None = None
    device: OrderDevice | None = None
    images: list[OrderImage] = []
    total_amount: Decimal | float | None = None
    quote: dict[str, Any] | None = None


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
