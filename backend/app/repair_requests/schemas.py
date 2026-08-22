from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, Field


class RepairImageResponse(BaseModel):
    id: str
    repair_id: str
    image_url: str
    image_type: str
    description: str | None = None
    created_at: datetime
    created_by: str

    class Config:
        from_attributes = True


class RepairRequestCreate(BaseModel):
    customer_id: str | None = None
    device_id: str = Field(min_length=1, max_length=10)
    issue_type: str
    description: str | None = None
    issue_description: str | None = None
    address_detail: str | None = None
    location_address: str | None = None
    location_lat: Decimal | None = None
    location_lng: Decimal | None = None
    latitude: Decimal | None = None
    longitude: Decimal | None = None
    request_type: str | None = None
    is_sos: bool = False
    image_urls: list[str] | None = None
    inspection_images: list[str] | None = None


class RepairRequestStatusUpdate(BaseModel):
    status: str
    cancel_reason: str | None = None


class TechnicianInfo(BaseModel):
    name: str
    phone: str


class RepairRequestStatusSyncResponse(BaseModel):
    request_id: str
    current_status: str
    technician_info: TechnicianInfo | None = None
    last_updated: datetime | str


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
    status: str
    assigned_at: datetime | None = None
    accepted_at: datetime | None = None
    arrived_at: datetime | None = None
    diagnosed_at: datetime | None = None
    repairing_at: datetime | None = None
    completed_at: datetime | None = None
    cancelled_at: datetime | None = None
    cancel_reason: str | None = None
    total_amount: Decimal | None = None
    created_at: datetime
    created_by: str
    updated_at: datetime
    updated_by: str
    images: list[RepairImageResponse] = []

    class Config:
        from_attributes = True


class RepairRequestListResponse(BaseModel):
    items: list[RepairRequestResponse]
    total: int
    page: int
    limit: int
