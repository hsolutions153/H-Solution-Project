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
    device_id: str = Field(min_length=1, max_length=50)
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
    images: list[str] | None = None
    booking_date: str | None = None
    booking_slot: str | None = None


class RepairRequestStatusUpdate(BaseModel):
    status: str
    cancel_reason: str | None = None
    total_amount: Decimal | float | None = None
    totalCost: Decimal | float | None = None


from enum import Enum


class ItemTypeEnum(str, Enum):
    SPARE_PART = "SPARE_PART"
    LABOR = "LABOR"
    SERVICE = "SERVICE"


class QuoteItemCreate(BaseModel):
    name: str | None = None
    item_name: str | None = None
    item_type: str | None = None
    quantity: float = 1.0
    price: float = 0.0
    unit_price: float | None = None
    subtotal: float | None = None


class QuoteCreateRequest(BaseModel):
    items: list[QuoteItemCreate] = []
    estimatedTime: str | None = None
    diagnosis_note: str | None = None
    severity: str | None = "MINOR"
    labor_fee: float | None = None
    parts_cost: float | None = None
    laborCost: float | None = None
    partsCost: float | None = None
    estimated_price: float | None = None
    total_amount: float | None = None


class QuoteItemResponse(BaseModel):
    id: str
    quote_id: str
    item_name: str
    item_type: str | None = "SPARE_PART"
    quantity: float
    unit_price: float
    subtotal: float


class QuoteResponse(BaseModel):
    id: str
    repair_id: str
    diagnosis_note: str | None = None
    severity: str | None = None
    labor_fee: float | None = 0
    parts_cost: float | None = 0
    estimated_price: float
    status: str
    created_at: datetime | str
    payment_method: str | None = None
    items: list[QuoteItemResponse] = []


class TechnicianInfo(BaseModel):
    name: str
    phone: str


class RepairRequestStatusSyncResponse(BaseModel):
    request_id: str
    current_status: str
    technician_info: TechnicianInfo | None = None
    last_updated: datetime | str


class CustomerInfo(BaseModel):
    id: str | None = None
    full_name: str | None = None
    phone: str | None = None
    email: str | None = None
    address: str | None = None
    avatar_url: str | None = None

    class Config:
        from_attributes = True


class DeviceInfo(BaseModel):
    id: str | None = None
    device_type: str | None = None
    manufacturer: str | None = None
    model_name: str | None = None

    class Config:
        from_attributes = True


class TechnicianDetailInfo(BaseModel):
    id: str | None = None
    name: str | None = None
    phone: str | None = None
    avatar: str | None = None
    specialization: str | None = None
    rating: float | None = None
    reviews: int | None = None
    experience_years: int | None = None
    verified: bool | None = None

    class Config:
        from_attributes = True


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
    payment_method: str | None = None
    created_at: datetime
    created_by: str
    updated_at: datetime
    updated_by: str
    images: list[RepairImageResponse] = []
    customer: CustomerInfo | None = None
    device: DeviceInfo | None = None
    technician: TechnicianDetailInfo | None = None

    class Config:
        from_attributes = True


class RepairRequestListResponse(BaseModel):
    items: list[RepairRequestResponse]
    total: int
    page: int
    limit: int
