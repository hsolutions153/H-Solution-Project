from datetime import date, datetime

from pydantic import BaseModel, Field


class DeviceCreate(BaseModel):
    customer_id: str | None = Field(default=None, max_length=10)
    device_type: str = Field(min_length=1, max_length=50)
    manufacturer: str = Field(min_length=1, max_length=100)
    model_name: str = Field(min_length=1, max_length=100)
    serial_number: str | None = Field(default=None, max_length=100)
    frame_number: str | None = Field(default=None, max_length=100)
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
    image_url: str | None = Field(default=None, max_length=500)
    notes: str | None = Field(default=None, max_length=1000)
    purchase_date: date | None = None
    is_default: bool | None = None


class DeviceImageResponse(BaseModel):
    image_url: str


class DeviceResponse(BaseModel):
    id: str
    customer_id: str
    device_type: str
    manufacturer: str
    model_name: str
    serial_number: str | None = None
    frame_number: str | None = None
    image_url: str | None = None
    notes: str | None = None
    purchase_date: date | None = None
    is_default: bool = False
    created_at: datetime | None = None
    updated_at: datetime | None = None

    class Config:
        from_attributes = True
