from datetime import date, datetime
from decimal import Decimal
from pydantic import BaseModel


class HistoryTechnician(BaseModel):
    id: str
    name: str
    phone: str | None = None


class HistoryImage(BaseModel):
    id: str
    image_url: str
    image_type: str
    description: str | None = None


class HistoryQuoteItem(BaseModel):
    item_name: str
    item_type: str
    quantity: Decimal
    unit_price: Decimal


class HistoryReview(BaseModel):
    rating: int
    comment: str | None = None


class DeviceHistoryRecord(BaseModel):
    repair_id: str
    request_code: str
    customer_id: str
    device_id: str
    issue_type: str
    issue_description: str
    location_address: str
    is_sos: bool
    status: str
    assigned_at: datetime | None = None
    diagnosed_at: datetime | None = None
    completed_at: datetime | None = None
    total_amount: Decimal | None = None
    technician: HistoryTechnician | None = None
    parts_replaced: list[HistoryQuoteItem] = []
    images: list[HistoryImage] = []
    review: HistoryReview | None = None

    class Config:
        from_attributes = True


class DeviceLifecycleResponse(BaseModel):
    device_id: str
    customer_id: str
    model_name: str
    manufacturer: str
    device_type: str
    serial_number: str | None = None
    frame_number: str | None = None
    image_url: str | None = None
    notes: str | None = None
    purchase_date: date | None = None
    total_repairs: int
    repairs: list[DeviceHistoryRecord] = []

    class Config:
        from_attributes = True


class RepairHistoryListResponse(BaseModel):
    items: list[DeviceHistoryRecord]
    total: int
    page: int
    limit: int
