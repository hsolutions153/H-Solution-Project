from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field


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
    qr_url: str | None = None
    pay_url: str | None = None
    bank_account: str | None = None
    bank_name: str | None = None
    bank_account_name: str | None = None


class MoMoPaymentResponse(BaseModel):
    success: bool
    pay_url: str | None = None
    qr_code_url: str | None = None
    order_id: str
    amount: float


class SepayWebhookPayload(BaseModel):
    id: int
    gateway: str | None = None
    transactionDate: str | None = None
    accountNumber: str | None = None
    code: str | None = None
    content: str | None = None
    transferType: str | None = None
    transferAmount: Decimal | None = Field(default=None, ge=0, allow_inf_nan=False)
    referenceCode: str | None = None
    accumulated: float | None = None
    subAccount: str | None = None
    description: str | None = None


class WebhookResponse(BaseModel):
    success: bool


class MoMoWebhookPayload(BaseModel):
    partnerCode: str
    orderId: str
    requestId: str
    amount: int = Field(ge=0)
    orderInfo: str
    orderType: str
    transId: int
    resultCode: int
    message: str
    payType: str
    responseTime: int
    extraData: str = ""
    signature: str
