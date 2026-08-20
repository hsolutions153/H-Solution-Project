from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel


class PaymentResponse(BaseModel):
    id: str
    repair_id: str
    payment_code: str
    amount: Decimal
    currency: str
    payment_method: str
    payment_status: str
    transaction_code: str | None = None
    failure_reason: str | None = None
    paid_at: datetime | None = None
    note: str | None = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class QRResponse(BaseModel):
    payment: PaymentResponse
    qr_url: str


class SepayWebhookPayload(BaseModel):
    id: int
    gateway: str | None = None
    transactionDate: str | None = None
    accountNumber: str | None = None
    code: str | None = None
    content: str | None = None
    transferType: str | None = None
    transferAmount: float | None = None
    referenceCode: str | None = None
    accumulated: float | None = None
    subAccount: str | None = None
    description: str | None = None


class WebhookResponse(BaseModel):
    success: bool
