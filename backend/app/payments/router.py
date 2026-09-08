from app.auth.utils import get_current_user
from app.payments.schemas import MoMoPaymentResponse, QRResponse, SepayWebhookPayload, WebhookResponse
from app.payments.service import confirm_momo_payment, create_momo_payment, fetch_qr, handle_sepay_webhook
from fastapi import APIRouter, Depends, Header, Query

router = APIRouter(prefix="/payments", tags=["Payments"])

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
