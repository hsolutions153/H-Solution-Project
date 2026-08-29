from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, Field


class QuoteItemCreate(BaseModel):
    item_name: str = Field(min_length=1, max_length=255)
    item_type: str = Field(default="SPARE_PART")
    quantity: Decimal = Field(default=Decimal("1"), gt=0)
    unit_price: Decimal = Field(default=Decimal("0"), ge=0)
    note: str | None = None


class QuoteItemResponse(BaseModel):
    id: str
    quote_id: str
    item_name: str
    item_type: str
    quantity: Decimal
    unit_price: Decimal
    note: str | None = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class EstimateCreate(BaseModel):
    repair_id: str = Field(min_length=1, max_length=50)
    diagnosis_note: str = Field(min_length=1)
    severity: str = Field(default="MINOR")
    labor_fee: Decimal = Field(default=Decimal("0"), ge=0)
    items: list[QuoteItemCreate] = Field(default_factory=list)


class EstimateApprovalRequest(BaseModel):
    action: str = Field(min_length=1)
    rejection_reason: str | None = None


class EstimateResponse(BaseModel):
    id: str
    repair_id: str
    diagnosis_note: str
    severity: str
    labor_fee: Decimal
    parts_cost: Decimal
    estimated_price: Decimal
    status: str
    reject_reason: str | None = None
    replied_by: str | None = None
    replied_at: datetime | None = None
    created_at: datetime
    created_by: str
    updated_at: datetime
    updated_by: str
    items: list[QuoteItemResponse] = []

    class Config:
        from_attributes = True
