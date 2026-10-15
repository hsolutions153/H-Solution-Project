from app.auth.utils import get_current_user
from app.payments.schemas import (
    CustomerPaymentSubmitRequest,
    MoMoPaymentResponse,
    MoMoWebhookPayload,
    PaymentActionResponse,
    PaymentResponse,
    QRResponse,
    SepayWebhookPayload,
    TechnicianPaymentConfirmRequest,
    WebhookResponse,
)
from app.payments.service import (
    confirm_momo_payment,
    create_momo_payment,
    customer_submit_payment,
    fetch_qr,
    handle_momo_webhook,
    handle_sepay_webhook,
    technician_confirm_payment,
)
from fastapi import APIRouter, Depends, Header, Query, Response

router = APIRouter(prefix="/payments", tags=["Payments"])


@router.post("/webhook/momo", status_code=204)
def momo_webhook(payload: MoMoWebhookPayload):
    handle_momo_webhook(payload)
    return Response(status_code=204)

@router.post("/webhook/sepay", response_model=WebhookResponse)
def sepay_webhook(
        payload: SepayWebhookPayload,
        authorization: str | None = Header(default=None),
):
    return handle_sepay_webhook(payload, authorization)


@router.get("/repair/{repair_id}/qr", response_model=QRResponse)
def get_payment_qr(
    repair_id: str,
    method: str = Query(default="BANK_TRANSFER"),
    current_user: dict = Depends(get_current_user)
):
    return fetch_qr(repair_id, current_user, method)


@router.post("/repair/{repair_id}/momo", response_model=MoMoPaymentResponse)
def init_momo_payment(
    repair_id: str,
    request_type: str = Query(default="payWithATM"),
    current_user: dict = Depends(get_current_user)
):
    return create_momo_payment(repair_id, current_user, request_type)


@router.post("/repair/{repair_id}/momo-confirm")
def confirm_momo(
    repair_id: str,
    current_user: dict = Depends(get_current_user)
):
    return confirm_momo_payment(repair_id, current_user)


@router.post("/repair/{repair_id}/customer-submit", response_model=PaymentActionResponse)
def customer_submit(
    repair_id: str,
    payload: CustomerPaymentSubmitRequest = CustomerPaymentSubmitRequest(),
    current_user: dict = Depends(get_current_user),
):
    """Khách hàng gửi xác nhận đã thanh toán (chuyển trạng thái sang PENDING để chờ thợ kiểm tra)."""
    return customer_submit_payment(repair_id, current_user, payload.payment_method, payload.note)


@router.post("/repair/{repair_id}/confirm", response_model=PaymentActionResponse)
def technician_confirm(
    repair_id: str,
    payload: TechnicianPaymentConfirmRequest = TechnicianPaymentConfirmRequest(),
    current_user: dict = Depends(get_current_user),
):
    """DUY NHẤT Thợ phụ trách ca sửa xác nhận đã nhận tiền (chuyển trạng thái sang PAID)."""
    return technician_confirm_payment(repair_id, current_user, payload.payment_method, payload.note)

