from datetime import date, datetime

from pydantic import BaseModel, Field, StrictBool, field_validator, model_validator
from app.core.validation import Identifier, InputModel, Name, OptionalUrl, VN_TZ, empty_to_none, not_boolean


class DeviceInput(InputModel):
    device_type: str = Field(min_length=1, max_length=50)
    manufacturer: Name
    model_name: Name
    serial_number: str | None = Field(default=None, max_length=100)
    frame_number: str | None = Field(default=None, max_length=100)
    battery_type: str | None = Field(default=None, max_length=100)
    manufacturing_year: int | None = Field(default=None, ge=1990, le=2100)
    image_url: OptionalUrl = None
    notes: str | None = Field(default=None, max_length=1000)
    purchase_date: date | None = None
    is_default: StrictBool | None = None

    @field_validator("serial_number", "frame_number", "battery_type", mode="before")
    @classmethod
    def normalize_optional_text(cls, value):
        return empty_to_none(value)

    @field_validator("device_type")
    @classmethod
    def valid_device_type(cls, value):
        value = value.upper()
        value = {"ELECTRIC_MOTORBIKE": "SCOOTER", "ELECTRIC_BIKE": "SCOOTER", "MOTORBIKE": "SCOOTER"}.get(value, value)
        if value not in {"SCOOTER", "WHEELCHAIR"}:
            raise ValueError("Loại thiết bị phải là SCOOTER hoặc WHEELCHAIR")
        return value

    @field_validator("manufacturing_year", mode="before")
    @classmethod
    def valid_year_type(cls, value):
        return not_boolean(value)

    @field_validator("purchase_date", mode="before")
    @classmethod
    def valid_purchase_date_format(cls, value):
        if value is None or type(value) is date:
            return value
        if isinstance(value, str):
            try:
                parsed = date.fromisoformat(value)
                if parsed.isoformat() == value:
                    return parsed
            except ValueError:
                pass
        raise ValueError("Ngày mua phải có định dạng YYYY-MM-DD")

    @model_validator(mode="after")
    def valid_device_dates(self):
        today = datetime.now(VN_TZ).date()
        if self.manufacturing_year and self.manufacturing_year > today.year:
            raise ValueError("Năm sản xuất không được ở tương lai")
        if self.purchase_date and self.purchase_date > today:
            raise ValueError("Ngày mua không được ở tương lai")
        if self.purchase_date and self.manufacturing_year and self.purchase_date.year < self.manufacturing_year:
            raise ValueError("Ngày mua không được trước năm sản xuất")
        return self


class DeviceCreate(DeviceInput):
    customer_id: Identifier | None = None


class DeviceUpdate(DeviceInput):
    non_nullable_fields = {"device_type", "manufacturer", "model_name", "is_default"}
    device_type: str | None = Field(default=None, min_length=1, max_length=50)
    manufacturer: Name | None = None
    model_name: Name | None = None
    serial_number: str | None = Field(default=None, max_length=100)
    frame_number: str | None = Field(default=None, max_length=100)
    battery_type: str | None = Field(default=None, max_length=100)
    manufacturing_year: int | None = Field(default=None, ge=1990, le=2100)
    image_url: OptionalUrl = None
    notes: str | None = Field(default=None, max_length=1000)
    purchase_date: date | None = None
    is_default: StrictBool | None = None


class DeviceImageResponse(BaseModel):
    image_url: str


class DeviceCustomer(BaseModel):
    id: str
    full_name: str | None = None
    phone: str | None = None


class DeviceResponse(BaseModel):
    id: str
    customer_id: str
    customer: DeviceCustomer | None = None
    device_type: str
    manufacturer: str
    model_name: str
    serial_number: str | None = None
    frame_number: str | None = None
    battery_type: str | None = None
    manufacturing_year: int | None = None
    image_url: str | None = None
    notes: str | None = None
    purchase_date: date | None = None
    is_default: bool = False
    created_at: datetime | None = None
    updated_at: datetime | None = None

    class Config:
        from_attributes = True
