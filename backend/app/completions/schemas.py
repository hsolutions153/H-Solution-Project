from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field


class CompletionCreate(BaseModel):
    request_id: str = Field(min_length=1, max_length=50)
    after_images: list[str] = Field(default_factory=list)  # danh sách url ảnh sau sửa
    final_cost: Decimal = Field(ge=0)                       # chi phí thực tế cuối cùng


class CompletionResponse(BaseModel):
    id: str
    request_code: str
    status: str
    total_amount: Decimal | None = None
    completed_at: datetime | None = None
    technician_id: str | None = None
    customer_id: str
    device_id: str
    updated_at: datetime

    class Config:
        from_attributes = True
