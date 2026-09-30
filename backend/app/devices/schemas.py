from datetime import date, datetime

from pydantic import BaseModel, Field


class DeviceCreate(BaseModel):
    """
    Cấu trúc dữ liệu xe máy điện / thiết bị phục vụ đăng ký & dịch vụ sửa chữa:
    - manufacturer: Thương hiệu xe (Bắt buộc)
    - model_name: Dòng xe (Bắt buộc)
    - id / serial_number: ID xe / Thiết bị / Biển số nhận diện (Bắt buộc nhận diện)
    - battery_type: Loại pin (LFP, Lithium-ion, Chì-axit...) (Cần thiết cho sửa chữa điện)
    - manufacturing_year: Năm sản xuất (Tùy chọn)
    """
    customer_id: str | None = Field(default=None, max_length=10)
    device_type: str = Field(min_length=1, max_length=50)
    manufacturer: str = Field(min_length=1, max_length=100)
    model_name: str = Field(min_length=1, max_length=100)
    serial_number: str | None = Field(default=None, max_length=100)
    frame_number: str | None = Field(default=None, max_length=100)
    battery_type: str | None = Field(default=None, max_length=100)
    manufacturing_year: int | None = Field(default=None, ge=1990, le=2100)
    image_url: str | None = Field(default=None, max_length=500)
    notes: str | None = Field(default=None, max_length=1000)
    purchase_date: date | None = None
    is_default: bool | None = None


class DeviceUpdate(BaseModel):
    device_type: str | None = Field(default=None, min_length=1, max_length=50)
    manufacturer: str | None = Field(default=None, min_length=1, max_length=100)
    model_name: str | None = Field(default=None, min_length=1, max_length=100)
    serial_number: str | None = Field(default=None, max_length=100)
    frame_number: str | None = Field(default=None, max_length=100)
    battery_type: str | None = Field(default=None, max_length=100)
    manufacturing_year: int | None = Field(default=None, ge=1990, le=2100)
    image_url: str | None = Field(default=None, max_length=500)
    notes: str | None = Field(default=None, max_length=1000)
    purchase_date: date | None = None
    is_default: bool | None = None


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
