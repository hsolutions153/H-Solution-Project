from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, StrictInt, field_validator
from app.core.validation import InputModel, Money, Note, choice

PaymentMethod = choice({"CASH", "COD", "BANK_TRANSFER"})
QRMethod = PaymentMethod
MoMoRequestType = choice({"payWithATM", "captureWallet"}, uppercase=False)


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


class CustomerPaymentSubmitRequest(InputModel):
    payment_method: PaymentMethod = "BANK_TRANSFER"
    note: Note | None = None


class TechnicianPaymentConfirmRequest(InputModel):
    payment_method: PaymentMethod | None = None
    note: Note | None = None


class PaymentActionResponse(BaseModel):
    success: bool = True
    message: str
    payment: PaymentResponse


class MoMoPaymentResponse(BaseModel):
    success: bool
    pay_url: str | None = None
    qr_code_url: str | None = None
    order_id: str
    amount: float


class SepayWebhookPayload(BaseModel):
    # Providers may add fields. Do not normalize signed/provider payloads.
    model_config = ConfigDict(extra="ignore", allow_inf_nan=False)
    id: StrictInt = Field(ge=0)
    gateway: str | None = Field(default=None, max_length=100)
    transactionDate: str | None = Field(default=None, max_length=50)
    accountNumber: str | None = Field(default=None, max_length=100)
    code: str | None = Field(default=None, max_length=100)
    content: str | None = Field(default=None, max_length=5000)
    transferType: str | None = Field(default=None, pattern=r"^(in|out)$")
    transferAmount: Money | None = None
    referenceCode: str | None = Field(default=None, max_length=100)
    accumulated: Decimal | None = Field(default=None, ge=0, allow_inf_nan=False)
    subAccount: str | None = Field(default=None, max_length=100)
    description: str | None = Field(default=None, max_length=5000)

    @field_validator("transactionDate")
    @classmethod
    def valid_transaction_date(cls, value):
        if value is not None:
            try:
                datetime.fromisoformat(value)
            except ValueError:
                raise ValueError("Ngày giao dịch không hợp lệ") from None
        return value


class WebhookResponse(BaseModel):
    success: bool


class MoMoWebhookPayload(BaseModel):
    model_config = ConfigDict(extra="ignore", allow_inf_nan=False)
    partnerCode: str = Field(min_length=1, max_length=100)
    orderId: str = Field(min_length=1, max_length=100)
    requestId: str = Field(min_length=1, max_length=100)
    amount: StrictInt = Field(ge=0, le=999999999999)
    orderInfo: str = Field(max_length=5000)
    orderType: str = Field(max_length=100)
    transId: StrictInt = Field(ge=0)
    resultCode: StrictInt = Field(ge=0)
    message: str = Field(max_length=5000)
    payType: str = Field(max_length=100)
    responseTime: StrictInt = Field(ge=0)
    extraData: str = Field(default="", max_length=10000)
    signature: str = Field(min_length=64, max_length=64, pattern=r"^[a-fA-F0-9]{64}$")
