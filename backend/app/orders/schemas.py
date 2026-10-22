from datetime import datetime
from decimal import Decimal
from app.core.validation import Identifier, InputModel, Reason, choice, validate_aliases
from app.repair_requests.models import REQUEST_STATUSES
from app.orders.models import ORDER_STATUSES

from typing import Any

from pydantic import BaseModel, model_validator

OrderStatusFilter = choice(ORDER_STATUSES)
OrderStatus = choice(REQUEST_STATUSES)


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
    payment_method: str | None = None
    payment_status: str | None = None
    quote: dict[str, Any] | None = None
    quotes: list[dict[str, Any]] | None = None
    initial_estimate: Decimal | float | None = None
    approved_estimate: Decimal | float | None = None
    pending_quote: dict[str, Any] | None = None


class OrderListResponse(BaseModel):
    items: list[OrderResponse]
    total: int
    page: int
    limit: int


class AssignTechnicianRequest(InputModel):
    technician_id: Identifier


class CancelOrderRequest(InputModel):
    cancel_reason: Reason | None = None
    reason: Reason | None = None

    @model_validator(mode="after")
    def valid_reason(self):
        validate_aliases(self, ("cancel_reason", "reason"))
        return self


class OrderStatusUpdate(CancelOrderRequest):
    status: OrderStatus


class AssignmentResponse(BaseModel):
    message: str
    order: OrderResponse
