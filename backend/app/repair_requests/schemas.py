from datetime import datetime
from decimal import Decimal
from typing import Any
from pydantic import BaseModel, Field, StrictBool, StrictInt, field_validator, model_validator, TypeAdapter
from app.core.validation import (
    Address, Identifier, InputModel, Latitude, Longitude, Money, Note,
    Name, Quantity, Reason, Url, choice, validate_aliases, validate_booking, validate_coordinates,
)
from app.repair_requests.models import ISSUE_TYPES, ITEM_TYPES, REQUEST_STATUSES

RepairStatus = choice(REQUEST_STATUSES)
IssueType = choice(ISSUE_TYPES)
RequestType = choice({"NORMAL", "SOS", "EMERGENCY"})
ItemType = choice(ITEM_TYPES)
Severity = choice({"MINOR", "MAJOR"})


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


class RepairRequestCreate(InputModel):
    customer_id: Identifier | None = None
    device_id: Identifier
    issue_type: IssueType
    description: Note | None = None
    issue_description: Note | None = None
    address_detail: Address | None = None
    location_address: Address | None = None
    location_lat: Latitude | None = None
    location_lng: Longitude | None = None
    latitude: Latitude | None = None
    longitude: Longitude | None = None
    request_type: RequestType | None = None
    is_sos: StrictBool = False
    image_urls: list[Url] | None = Field(default=None, max_length=20)
    inspection_images: list[Url] | None = Field(default=None, max_length=20)
    images: list[Url] | None = Field(default=None, max_length=20)
    booking_date: str | None = Field(default=None, max_length=10)
    booking_slot: str | None = Field(default=None, max_length=5)
    appointment_date: str | None = Field(default=None, max_length=10)
    appointment_slot: str | None = Field(default=None, max_length=5)

    @model_validator(mode="after")
    def valid_request(self):
        validate_aliases(self, ("latitude", "location_lat"), ("longitude", "location_lng"),
                         ("description", "issue_description"), ("address_detail", "location_address"),
                         ("booking_date", "appointment_date"), ("booking_slot", "appointment_slot"),
                         ("image_urls", "inspection_images", "images"))
        lat = self.location_lat if self.location_lat is not None else self.latitude
        lng = self.location_lng if self.location_lng is not None else self.longitude
        validate_coordinates(lat, lng, required=self.is_sos or self.request_type in {"SOS", "EMERGENCY"})
        if self.is_sos and self.request_type == "NORMAL":
            raise ValueError("is_sos không phù hợp với request_type NORMAL")
        validate_booking(self.booking_date or self.appointment_date, self.booking_slot or self.appointment_slot)
        return self


class RepairRequestStatusUpdate(InputModel):
    status: RepairStatus
    cancel_reason: Reason | None = None
    reject_reason: Reason | None = None
    total_amount: Money | None = None
    totalCost: Money | None = None
    final_cost: Money | None = None
    # Báo giá khách hàng đang xem khi duyệt/từ chối; dùng để phát hiện KTV vừa sửa báo giá
    quote_id: Identifier | None = None
    quote_updated_at: datetime | None = None

    @model_validator(mode="after")
    def valid_amounts(self):
        validate_aliases(self, ("total_amount", "totalCost", "final_cost"))
        return self


from enum import Enum


class ItemTypeEnum(str, Enum):
    SPARE_PART = "SPARE_PART"
    LABOR = "LABOR"
    SERVICE = "SERVICE"


class QuoteItemCreate(InputModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    item_name: str | None = Field(default=None, min_length=1, max_length=200)
    item_type: ItemType | None = None
    quantity: Quantity = Decimal("1")
    price: Money | None = None
    unit_price: Money | None = None
    subtotal: Money | None = None

    @model_validator(mode="after")
    def valid_item(self):
        validate_aliases(self, ("name", "item_name"), ("price", "unit_price"))
        if self.name is None and self.item_name is None:
            raise ValueError("Cần cung cấp tên hạng mục")
        price = self.price if self.price is not None else self.unit_price
        if price is None:
            raise ValueError("Cần cung cấp đơn giá hạng mục")
        subtotal = self.quantity * price
        TypeAdapter(Money).validate_python(subtotal)
        if self.subtotal is not None and self.subtotal != subtotal:
            raise ValueError("Thành tiền phải bằng số lượng nhân đơn giá")
        return self


class QuoteCreateRequest(InputModel):
    items: list[QuoteItemCreate] = Field(default_factory=list, max_length=100)
    estimatedTime: str | None = Field(default=None, min_length=1, max_length=100)
    diagnosis_note: Note | None = None
    severity: Severity | None = "MINOR"
    labor_fee: Money | None = None
    parts_cost: Money | None = None
    laborCost: Money | None = None
    partsCost: Money | None = None
    estimated_price: Money | None = None
    total_amount: Money | None = None

    @model_validator(mode="after")
    def valid_quote(self):
        validate_aliases(self, ("labor_fee", "laborCost"), ("parts_cost", "partsCost"), ("estimated_price", "total_amount"))
        # Legacy clients may send a total without individual items.
        labor = self.labor_fee if self.labor_fee is not None else self.laborCost
        parts = self.parts_cost if self.parts_cost is not None else self.partsCost
        supplied_total = self.total_amount if self.total_amount is not None else self.estimated_price
        if self.items:
            computed_labor = Decimal(0)
            computed_parts = Decimal(0)
            for item in self.items:
                price = item.price if item.price is not None else item.unit_price
                subtotal = item.quantity * price
                is_labor = item.item_type == "LABOR" or (item.item_type is None and any(
                    word in (item.name or item.item_name).lower() for word in ("tiền công", "công sửa", "công kỹ thuật", "labor")
                ))
                if is_labor:
                    computed_labor += subtotal
                else:
                    computed_parts += subtotal
            if (labor is not None and labor != computed_labor) or (parts is not None and parts != computed_parts):
                raise ValueError("Tiền công và linh kiện phải khớp các hạng mục")
            total = computed_labor + computed_parts
        else:
            total = (labor or Decimal(0)) + (parts or Decimal(0))
        TypeAdapter(Money).validate_python(total)
        if supplied_total is not None and (self.items or labor is not None or parts is not None) and supplied_total != total:
            raise ValueError("Tổng báo giá phải khớp chi phí hạng mục")
        if not self.items and labor is None and parts is None and supplied_total is None:
            raise ValueError("Cần cung cấp hạng mục hoặc chi phí báo giá")
        return self


class QuoteItemResponse(BaseModel):
    id: str | None = None
    quote_id: str | None = None
    item_name: str | None = None
    item_type: str | None = "SPARE_PART"
    quantity: float | None = 1.0
    unit_price: float | None = 0.0
    subtotal: float | None = 0.0

    @model_validator(mode="before")
    @classmethod
    def prepare_fields(cls, data: Any):
        if isinstance(data, dict):
            item_name = data.get("item_name") or data.get("name") or "Linh kiện / Dịch vụ"
            data["item_name"] = item_name
            try:
                qty = float(data.get("quantity") or 1.0)
            except (ValueError, TypeError):
                qty = 1.0
            data["quantity"] = qty

            try:
                price = float(data.get("unit_price") or data.get("price") or 0.0)
            except (ValueError, TypeError):
                price = 0.0
            data["unit_price"] = price

            if data.get("subtotal") is None:
                data["subtotal"] = qty * price
            else:
                try:
                    data["subtotal"] = float(data["subtotal"])
                except (ValueError, TypeError):
                    data["subtotal"] = qty * price
        return data


class QuoteResponse(BaseModel):
    id: str
    repair_id: str
    diagnosis_note: str | None = None
    severity: str | None = None
    labor_fee: float | None = 0
    parts_cost: float | None = 0
    estimated_price: float | None = 0
    status: str
    reject_reason: str | None = None
    created_at: datetime | str | None = None
    updated_at: datetime | str | None = None
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


class RepairRouteResponse(BaseModel):
    distance_meters: float
    duration_seconds: float
    profile: str
    geometry: list[list[float]]
    origin: list[float]
    destination: list[float]


class MapboxPublicTokenResponse(BaseModel):
    access_token: str


class ReverseGeocodeResponse(BaseModel):
    address: str
    ward: str
    province: str
    latitude: float
    longitude: float


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
    initial_estimate: Decimal | None = None
    approved_estimate: Decimal = Decimal("0")
    payment_method: str | None = None
    created_at: datetime
    payment_status: str = "UNPAID"
    created_by: str
    updated_at: datetime
    updated_by: str
    images: list[RepairImageResponse] = []
    customer: CustomerInfo | None = None
    device: DeviceInfo | None = None
    technician: TechnicianDetailInfo | None = None
    quote: QuoteResponse | None = None
    quotes: list[QuoteResponse] = []

    class Config:
        from_attributes = True


class RepairRequestListResponse(BaseModel):
    items: list[RepairRequestResponse]
    total: int
    page: int
    limit: int


class TechnicianRatingRequest(InputModel):
    rating: StrictInt = Field(..., ge=1, le=5)
    comment: Note | None = None
    tags: list[Name] | None = Field(default=None, max_length=20)

    @field_validator("tags")
    @classmethod
    def valid_tags(cls, value):
        if value is not None:
            value = [tag.strip() for tag in value]
            if any(not tag for tag in value):
                raise ValueError("Nhãn đánh giá không được để trống")
        return value


class TechnicianRatingResponse(BaseModel):
    success: bool = True
    message: str = "Đánh giá kỹ thuật viên thành công"
    rating: int
    technician_id: str | None = None

