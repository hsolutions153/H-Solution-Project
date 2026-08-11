from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field


class RepairRequestCreate(BaseModel):
    device_id: str = Field(min_length=1, max_length=10)
    issue_type: str
    issue_description: str = Field(min_length=1)
    location_address: str = Field(min_length=1, max_length=200)
    latitude: Decimal | None = None
    longitude: Decimal | None = None
    is_sos: bool = False
    inspection_images: list[str] | None = None


class RepairRequestStatusUpdate(BaseModel):
    status: str
    cancel_reason: str | None = None


class RepairRequestResponse(BaseModel):
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
    inspection_images: list[str] | None = None
    after_repair_images: list[str] | None = None
    status: str
    assigned_at: datetime | None = None
    accepted_at: datetime | None = None
    arrived_at: datetime | None = None
    completed_at: datetime | None = None
    cancelled_at: datetime | None = None
    cancel_reason: str | None = None
    payment_method: str | None = None
    payment_status: str
    total_amount: Decimal | None = None
    created_at: datetime
    updated_at: datetime


class RepairRequestListResponse(BaseModel):
    items: list[RepairRequestResponse]
    total: int
    page: int
    limit: int
