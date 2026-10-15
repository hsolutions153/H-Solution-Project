import hashlib
import hmac
import json
import os
import re
import secrets
import uuid
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
from urllib.parse import quote

import logging
import requests
from app.auth import repository as auth_repository
from app.core.exceptions import AppException, ErrorCode
from app.customers.models import ADMIN_ROLE_CODE, CUSTOMER_ROLE_CODE
from app.payments import repository
from app.repair_requests.models import TECHNICIAN_ROLE_CODE

logger = logging.getLogger(__name__)

PAYMENT_CODE_PREFIX = os.getenv('PAYMENT_CODE_PREFIX') or 'HS'
SEPAY_BANK_ACCOUNT = os.getenv('SEPAY_BANK_ACCOUNT')
SEPAY_API_KEY = os.getenv('SEPAY_API_KEY')
MOMO_FINAL_FAILURE_CODES = {98, 99, 1001, 1002, 1003, 1004, 1005, 1006, 1007, 1017, 1026, 4001, 4002, 4100}


def _payment_id() -> str:
    return secrets.token_hex(5).upper()


def _payment_code() -> str:
    return f'{PAYMENT_CODE_PREFIX}{secrets.token_hex(4).upper()}'


def _is_role(current_user: dict, code: str) -> bool:
    if current_user.get('role'):
        return current_user['role'] == code
    role = auth_repository.get_role_by_code(code)
    return bool(role and current_user.get('role_id') == role['id'])


def _authorize_repair(repair_id: str, current_user: dict) -> dict:
    repair = repository.get_repair_request(repair_id)
    if not repair:
        raise AppException(ErrorCode.REQUEST_NOT_FOUND)
    if not (
        _is_role(current_user, ADMIN_ROLE_CODE)
        or (_is_role(current_user, CUSTOMER_ROLE_CODE) and repair['customer_id'] == current_user['sub'])
        or (_is_role(current_user, TECHNICIAN_ROLE_CODE) and repair.get('technician_id') == current_user['sub'])
    ):
        raise AppException(ErrorCode.FORBIDDEN)
    return repair


def _amount(value) -> Decimal:
    try:
        amount = Decimal(str(value))
        if not amount.is_finite() or amount < 0 or amount != amount.to_integral_value():
            raise ValueError('Invalid VND amount')
        return amount
    except (InvalidOperation, ValueError, TypeError) as error:
        raise AppException(ErrorCode.PAYMENT_AMOUNT_UNDETERMINED) from error


def _final_amount(repair: dict) -> Decimal:
    if repair.get('status') not in {'ESTIMATE_APPROVED', 'REPAIRING', 'COMPLETED'}:
        raise AppException(ErrorCode.PAYMENT_AMOUNT_UNDETERMINED, message='Vui lòng chờ kỹ thuật viên nghiệm thu chi phí sửa chữa trước khi thanh toán.')
    amt = repair.get('total_amount')
    if amt is None or (isinstance(amt, (int, float, str)) and float(amt) == 0):
        try:
            accepted_quote = repository.get_accepted_quote(repair['id'])
            if accepted_quote and accepted_quote.get('estimated_price') is not None:
                amt = accepted_quote['estimated_price']
        except Exception:
            pass
    if amt is None:
        raise AppException(ErrorCode.PAYMENT_AMOUNT_UNDETERMINED, message='Vui lòng chờ kỹ thuật viên nghiệm thu chi phí sửa chữa trước khi thanh toán.')
    return _amount(amt)


def _metadata(payment: dict) -> dict:
    try:
        data = json.loads(payment.get('note') or '{}')
        return data if isinstance(data, dict) else {}
    except (ValueError, TypeError):
        return {}


def _ensure_payment(repair: dict, current_user: dict, method: str) -> dict:
    amount = _final_amount(repair)
    payment = repository.get_payment_by_repair_id(repair['id'])
    if payment and payment.get('payment_status') == 'PAID':
        raise AppException(ErrorCode.PAYMENT_ALREADY_PAID)
    fields = {'amount': str(amount), 'payment_method': method, 'updated_by': current_user['sub']}
    if payment:
        if payment.get('payment_status') in {'FAILED', 'CANCELLED', 'EXPIRED'}:
            fields.update(payment_status='UNPAID', payment_code=_payment_code(), note=None, failure_reason=None)
        if payment.get('payment_status') == 'PENDING' and (
            payment['payment_method'] != method or _amount(payment['amount']) != amount
        ):
            raise AppException(ErrorCode.INVALID_STATUS_TRANSITION, message='Giao dịch đang được xử lý. Vui lòng kiểm tra kết quả trước khi đổi phương thức thanh toán.')
        updated = repository.update_unpaid_payment(payment['id'], fields)
        if not updated:
            raise AppException(ErrorCode.PAYMENT_ALREADY_PAID)
        return updated
    payment = repository.create_payment({
        'id': _payment_id(), 'repair_id': repair['id'], 'payment_code': _payment_code(),
        'currency': 'VND', 'payment_status': 'UNPAID', 'created_by': current_user['sub'], **fields,
    })
    if not payment:
        raise AppException(ErrorCode.DATABASE_ERROR)
    repository.add_payment_history({
        'id': _payment_id(), 'payment_id': payment['id'], 'action': 'CREATED',
        'old_status': None, 'new_status': 'UNPAID', 'amount': str(amount), 'changed_by': current_user['sub'],
    })
    return payment


def _settle(payment: dict, transaction_code: str, changed_by: str | None = None) -> dict:
    if payment.get('payment_status') == 'PAID':
        return payment
    repair = repository.get_repair_request(payment['repair_id'])
    if not repair or _final_amount(repair) != _amount(payment['amount']):
        raise AppException(ErrorCode.PAYMENT_AMOUNT_UNDETERMINED)
    previous = repository.get_payment_by_transaction_code(transaction_code)
    if previous and previous['id'] != payment['id']:
        raise AppException(ErrorCode.VALIDATION_ERROR, message='Giao dịch này đã được ghi nhận cho một khoản thanh toán khác.')
    now = datetime.now(timezone.utc).isoformat()
    updated = repository.update_unpaid_payment(payment['id'], {
        'payment_status': 'PAID', 'transaction_code': transaction_code,
        'paid_at': now, 'updated_by': changed_by or 'SYSTEM',
    })
    if not updated:
        current = repository.get_payment_by_repair_id(payment['repair_id'])
        if current and current.get('payment_status') == 'PAID':
            return current
        raise AppException(ErrorCode.DATABASE_ERROR)
    repository.add_payment_history({
        'id': _payment_id(), 'payment_id': payment['id'], 'action': 'PAID',
        'old_status': payment['payment_status'], 'new_status': 'PAID',
        'amount': str(payment['amount']), 'transaction_code': transaction_code, 'changed_by': changed_by,
    })
    # Thanh toán không thay đổi trạng thái hoặc chi phí cuối của đơn sửa chữa
    return updated


def fetch_qr(repair_id: str, current_user: dict, payment_method: str = 'BANK_TRANSFER'):
    from app.technicians.repository import get_bank_account

    repair = _authorize_repair(repair_id, current_user)
    method = 'CASH' if payment_method == 'COD' else payment_method
    if method not in {'CASH', 'BANK_TRANSFER'}:
        raise AppException(ErrorCode.VALIDATION_ERROR, message='Phương thức thanh toán không hợp lệ.')
    amount = _final_amount(repair)

    # Lấy thông tin STK của kỹ thuật viên phụ trách đơn
    tech_id = repair.get('technician_id')
    tech_bank = get_bank_account(tech_id) if tech_id else None

    if amount > 0 and method == 'BANK_TRANSFER':
        if tech_bank and tech_bank.get('account_number'):
            bank = (tech_bank.get('bank_name') or tech_bank.get('bank_code') or '').replace(' ', '')
            acc = tech_bank['account_number']
            holder = (tech_bank.get('account_holder') or '').strip().upper()
            clean_holder = quote(holder)
            qr_url = f"https://vietqr.app/img?bank={bank}&acc={acc}&template=qronly&amount={int(amount)}&showinfo=true&fullacc=true&holder={clean_holder}"
            bank_account = acc
            bank_name = tech_bank.get('bank_name') or bank
            bank_account_name = holder
        else:
            raise AppException(
                ErrorCode.SERVICE_UNAVAILABLE,
                message='Kỹ thuật viên phụ trách chưa liên kết tài khoản ngân hàng nhận tiền.',
            )
    else:
        qr_url = None
        bank_account = None
        bank_name = None
        bank_account_name = None

    payment = _ensure_payment(repair, current_user, method)
    if amount == 0:
        payment = _settle(payment, f'FREE:{payment["id"]}', current_user['sub'])

    return {
        'payment': payment,
        'qr_url': qr_url,
        'bank_account': bank_account,
        'bank_name': bank_name,
        'bank_account_name': bank_account_name,
    }


def customer_submit_payment(repair_id: str, current_user: dict, payment_method: str = 'BANK_TRANSFER', note: str | None = None) -> dict:
    repair = repository.get_repair_request(repair_id)
    if not repair:
        raise AppException(ErrorCode.REQUEST_NOT_FOUND)
    if not (_is_role(current_user, CUSTOMER_ROLE_CODE) and repair['customer_id'] == current_user['sub']):
        raise AppException(ErrorCode.FORBIDDEN, message="Chỉ khách hàng sở hữu đơn mới có thể xác nhận thanh toán.")
    if repair.get('status') not in {'ESTIMATE_APPROVED', 'REPAIRING', 'COMPLETED'}:
        raise AppException(ErrorCode.INVALID_STATUS_TRANSITION, message="Chỉ có thể thanh toán khi đơn đang sửa chữa hoặc đã hoàn thành.")

    method = 'CASH' if payment_method in {'COD', 'CASH'} else payment_method
    if method not in {'CASH', 'BANK_TRANSFER'}:
        raise AppException(ErrorCode.VALIDATION_ERROR, message="Phương thức thanh toán không hợp lệ.")

    amount = _final_amount(repair)
    payment = _ensure_payment(repair, current_user, method)
    if amount == 0:
        payment = _settle(payment, f'FREE:{payment["id"]}', current_user['sub'])
        return {"success": True, "message": "Đơn hàng miễn phí (0 đ) đã được xử lý hoàn tất.", "payment": payment}

    if payment.get('payment_status') == 'PAID':
        return {"success": True, "message": "Khoản thanh toán đã hoàn tất trước đó.", "payment": payment}

    submit_note = note or f"Khách hàng đã báo hoàn tất thanh toán qua {('Tiền mặt' if method == 'CASH' else 'Chuyển khoản')}."
    updated = repository.update_unpaid_payment(payment['id'], {
        'payment_status': 'PENDING',
        'payment_method': method,
        'note': submit_note,
        'updated_by': current_user['sub'],
    })
    if not updated:
        payment = repository.get_payment_by_repair_id(repair_id)
        if payment and payment.get('payment_status') == 'PAID':
            return {"success": True, "message": "Khoản thanh toán đã hoàn tất trước đó.", "payment": payment}
        raise AppException(ErrorCode.DATABASE_ERROR)

    try:
        repository.update_repair_payment_info(repair_id, {
            'payment_status': 'PENDING',
            'payment_method': method,
        })
    except Exception as r_err:
        logger.warning(f"Could not update repair_request payment_status to PENDING: {r_err}")

    repository.add_payment_history({
        'id': _payment_id(),
        'payment_id': payment['id'],
        'action': 'PAYMENT_PENDING',
        'old_status': payment.get('payment_status'),
        'new_status': 'PENDING',
        'amount': str(amount),
        'note': submit_note,
        'changed_by': current_user['sub'],
    })
    return {
        "success": True,
        "message": "Đã gửi thông báo thanh toán. Vui lòng chờ kỹ thuật viên kiểm tra và xác nhận.",
        "payment": updated,
    }


def technician_confirm_payment(repair_id: str, current_user: dict, payment_method: str | None = None, note: str | None = None) -> dict:
    repair = repository.get_repair_request(repair_id)
    if not repair:
        raise AppException(ErrorCode.REQUEST_NOT_FOUND)

    # DUY NHẤT Kỹ thuật viên phụ trách ca sửa này mới được quyền xác nhận nhận tiền!
    is_tech = _is_role(current_user, TECHNICIAN_ROLE_CODE) and repair.get('technician_id') == current_user['sub']
    if not is_tech:
        raise AppException(ErrorCode.FORBIDDEN, message="Chỉ kỹ thuật viên phụ trách ca sửa này mới có quyền xác nhận nhận tiền.")

    if repair.get('status') not in {'ESTIMATE_APPROVED', 'REPAIRING', 'COMPLETED'}:
        raise AppException(ErrorCode.INVALID_STATUS_TRANSITION, message="Chỉ có thể xác nhận thanh toán khi đơn đang sửa chữa hoặc đã hoàn thành.")

    payment = repository.get_payment_by_repair_id(repair_id)
    method = payment_method or (payment.get('payment_method') if payment else 'CASH')
    if method in {'COD', 'CASH'}:
        method = 'CASH'
    elif method not in {'CASH', 'BANK_TRANSFER'}:
        method = 'BANK_TRANSFER'

    amount = _final_amount(repair)
    if not payment:
        payment = _ensure_payment(repair, current_user, method)

    if payment.get('payment_status') == 'PAID':
        return {"success": True, "message": "Thanh toán đã được xác nhận trước đó.", "payment": payment}

    if payment.get('payment_method') != method:
        payment = repository.update_unpaid_payment(payment['id'], {'payment_method': method, 'updated_by': current_user['sub']}) or payment

    tx_code = f"TECH:{current_user['sub']}:{secrets.token_hex(3).upper()}"
    settled = _settle(payment, tx_code, changed_by=current_user['sub'])

    confirm_note = note or f"Kỹ thuật viên ({current_user['sub']}) đã xác nhận nhận đủ tiền qua {'Tiền mặt' if method == 'CASH' else 'Chuyển khoản'}."
    repository.update_payment(settled['id'], {'note': confirm_note})
    settled['note'] = confirm_note

    # Tự động cập nhật đơn hàng sang COMPLETED trong database khi KTV gạt xác nhận thanh toán
    if repair.get('status') != 'COMPLETED':
        try:
            from app.repair_requests.repository import update_repair_request, add_status_history
            from app.repair_requests.service import _request_id
            now = datetime.now(timezone.utc).isoformat()
            update_repair_request(repair['id'], {
                'status': 'COMPLETED',
                'total_amount': float(amount),
                'updated_by': current_user['sub'],
            })
            add_status_history({
                'id': _request_id(),
                'repair_id': repair['id'],
                'status': 'COMPLETED',
                'changed_by': current_user['sub'],
                'note': f"Kỹ thuật viên xác nhận thanh toán ({'Tiền mặt' if method == 'CASH' else 'Chuyển khoản'}) và hoàn tất đơn sửa chữa.",
            })
            from app.db.database import supabase
            c_resp = (
                supabase.table("repair_requests")
                .select("id", count="exact")
                .eq("technician_id", current_user['sub'])
                .eq("status", "COMPLETED")
                .execute()
            )
            if c_resp and c_resp.count is not None:
                supabase.table("technician_profiles").update({"total_jobs_done": c_resp.count}).eq("user_id", current_user['sub']).execute()
        except Exception as auto_comp_err:
            logger.warning(f"Failed to auto-update repair status to COMPLETED: {auto_comp_err}")

    return {
        "success": True,
        "message": f"Kỹ thuật viên đã xác nhận thanh toán thành công ({'Tiền mặt' if method == 'CASH' else 'Chuyển khoản'}).",
        "payment": settled,
    }


def handle_sepay_webhook(payload, auth_header: str | None):
    if not auth_header or not auth_header.startswith('Apikey ') or not SEPAY_API_KEY or not secrets.compare_digest(auth_header[7:], SEPAY_API_KEY):
        raise AppException(ErrorCode.PAYMENT_WEBHOOK_UNAUTHORIZED)
    if payload.transferType != 'in':
        return {'success': True}
    if SEPAY_BANK_ACCOUNT and payload.accountNumber != SEPAY_BANK_ACCOUNT:
        return {'success': True}
    payment = repository.get_payment_by_code(payload.code.strip().upper()) if payload.code else None
    if not payment:
        for word in re.findall(r'[A-Z0-9]+', f'{payload.content or ""} {payload.description or ""}'.upper()):
            if word.startswith(PAYMENT_CODE_PREFIX):
                payment = repository.get_payment_by_code(word)
                if payment:
                    break
    if not payment or payment.get('payment_status') == 'PAID':
        return {'success': True}
    if payment.get('payment_method') != 'BANK_TRANSFER' or payload.transferAmount is None:
        return {'success': True}
    # Chuyển tiền một phần: ghi nhận nhưng không quyết toán
    if _amount(payload.transferAmount) < _amount(payment['amount']):
        return {'success': True}
    reference = payload.referenceCode or str(payload.id)
    _settle(payment, f'SEPAY:{reference}')
    return {'success': True}


def _momo_config() -> dict:
    config = {key: os.getenv(f'MOMO_{key.upper()}') for key in ('partner_code', 'access_key', 'secret_key')}
    if not all(config.values()):
        raise AppException(ErrorCode.SERVICE_UNAVAILABLE, message='Thanh toán MoMo chưa được cấu hình.')
    config['create_url'] = os.getenv('MOMO_API_URL', 'https://test-payment.momo.vn/v2/gateway/api/create')
    config['query_url'] = os.getenv('MOMO_QUERY_URL', config['create_url'].rsplit('/', 1)[0] + '/query')
    return config


def _signature(data: dict, secret: str) -> str:
    raw = '&'.join(f'{key}={data[key]}' for key in sorted(data))
    return hmac.new(secret.encode(), raw.encode(), hashlib.sha256).hexdigest()


def _momo_post(url: str, payload: dict) -> dict:
    try:
        response = requests.post(url, json=payload, timeout=30)
        response.raise_for_status()
        data = response.json()
        if not isinstance(data, dict):
            raise ValueError('Invalid gateway response')
        return data
    except (requests.RequestException, ValueError) as error:
        raise AppException(ErrorCode.SERVICE_UNAVAILABLE, message='Không thể kết nối dịch vụ MoMo. Vui lòng thử lại.') from error


def _fail_momo(payment: dict, result_code: int, changed_by: str | None = None) -> dict:
    if payment.get('payment_status') in {'PAID', 'FAILED'}:
        return payment
    updated = repository.update_unpaid_payment(payment['id'], {
        'payment_status': 'FAILED', 'failure_reason': f'MoMo resultCode={result_code}',
        'updated_by': changed_by or 'SYSTEM',
    })
    if not updated:
        raise AppException(ErrorCode.DATABASE_ERROR)
    repository.add_payment_history({
        'id': _payment_id(), 'payment_id': payment['id'], 'action': 'FAILED',
        'old_status': payment['payment_status'], 'new_status': 'FAILED',
        'amount': str(payment['amount']), 'changed_by': changed_by,
    })
    return updated


def create_momo_payment(repair_id: str, current_user: dict, request_type: str = 'payWithATM'):
    repair = _authorize_repair(repair_id, current_user)
    amount = _final_amount(repair)
    if request_type not in {'payWithATM', 'captureWallet'}:
        raise AppException(ErrorCode.VALIDATION_ERROR)
    config = _momo_config() if amount > 0 else None
    payment = _ensure_payment(repair, current_user, 'QR')
    if amount == 0:
        _settle(payment, f'FREE:{payment["id"]}', current_user['sub'])
        return {'success': True, 'pay_url': None, 'qr_code_url': None, 'order_id': payment['payment_code'], 'amount': 0}
    metadata = _metadata(payment)
    if metadata.get('provider') == 'MOMO' and metadata.get('pay_url') and payment.get('payment_status') == 'PENDING':
        return {'success': True, 'pay_url': metadata['pay_url'], 'qr_code_url': metadata.get('qr_code_url'), 'order_id': payment['payment_code'], 'amount': float(amount)}
    request_id = metadata.get('request_id') or str(uuid.uuid4())
    payload = metadata.get('request') or {
        'partnerCode': config['partner_code'], 'requestId': request_id,
        'amount': int(amount), 'orderId': payment['payment_code'],
        'orderInfo': f'Thanh toan don sua chua {repair_id}',
        'redirectUrl': f'{os.getenv("USER_APP_URL", "http://localhost:3002").rstrip("/")}/home/history/{repair_id}',
        'ipnUrl': os.getenv('MOMO_IPN_URL') or f'{os.getenv("PUBLIC_API_URL", "http://localhost:8000").rstrip("/")}/api/v1/payments/webhook/momo',
        'lang': 'vi', 'requestType': request_type, 'autoCapture': True, 'extraData': '',
    }
    # Lưu metadata trước khi gọi gateway để không mất mapping nếu timeout
    metadata = {'provider': 'MOMO', 'request_id': request_id, 'request': dict(payload)}
    pending = payment if payment.get('payment_status') == 'PENDING' and _metadata(payment).get('request') else repository.begin_momo_payment(payment['id'], {'payment_status': 'PENDING', 'note': json.dumps(metadata), 'updated_by': current_user['sub']})
    if not pending:
        current = repository.get_payment_by_repair_id(repair_id)
        if current and (current.get('payment_status') == 'PAID' or (current.get('payment_status') == 'PENDING' and _metadata(current).get('provider') == 'MOMO')):
            saved = _metadata(current)
            return {'success': True, 'pay_url': saved.get('pay_url'), 'qr_code_url': saved.get('qr_code_url'), 'order_id': current['payment_code'], 'amount': float(amount)}
        raise AppException(ErrorCode.DATABASE_ERROR)
    signed = {key: payload[key] for key in ('amount', 'extraData', 'ipnUrl', 'orderId', 'orderInfo', 'partnerCode', 'redirectUrl', 'requestId', 'requestType')}
    payload['signature'] = _signature({'accessKey': config['access_key'], **signed}, config['secret_key'])
    result = _momo_post(config['create_url'], payload)
    if result.get('resultCode') in {40, 41}:
        return {'success': True, 'pay_url': None, 'qr_code_url': None, 'order_id': payment['payment_code'], 'amount': float(amount)}
    if result.get('resultCode') != 0:
        _fail_momo(pending, result.get('resultCode', 99), current_user['sub'])
        raise AppException(ErrorCode.SERVICE_UNAVAILABLE, message='MoMo chưa thể tạo giao dịch thanh toán. Vui lòng thử lại.')
    if not result.get('payUrl'):
        raise AppException(ErrorCode.SERVICE_UNAVAILABLE, message='MoMo chưa trả về đường dẫn thanh toán. Vui lòng kiểm tra kết quả giao dịch trước khi thử lại.')
    metadata.update(pay_url=result['payUrl'], qr_code_url=result.get('qrCodeUrl'))
    if not repository.update_unpaid_payment(payment['id'], {'payment_status': 'PENDING', 'note': json.dumps(metadata), 'updated_by': current_user['sub']}):
        current = repository.get_payment_by_repair_id(repair_id)
        if current and current.get('payment_status') == 'PAID':
            return {'success': True, 'pay_url': None, 'qr_code_url': None, 'order_id': current['payment_code'], 'amount': float(amount)}
        raise AppException(ErrorCode.DATABASE_ERROR)
    return {'success': True, 'pay_url': result['payUrl'], 'qr_code_url': result.get('qrCodeUrl'), 'order_id': payment['payment_code'], 'amount': float(amount)}


def confirm_momo_payment(repair_id: str, current_user: dict):
    repair = _authorize_repair(repair_id, current_user)
    _final_amount(repair)
    payment = repository.get_payment_by_repair_id(repair_id)
    if not payment:
        raise AppException(ErrorCode.PAYMENT_NOT_FOUND)
    if payment.get('payment_status') == 'PAID':
        return {'success': True, 'payment_status': 'PAID'}
    if _metadata(payment).get('provider') != 'MOMO':
        raise AppException(ErrorCode.VALIDATION_ERROR, message='Đơn này chưa có giao dịch MoMo.')
    config = _momo_config()
    payload = {'partnerCode': config['partner_code'], 'requestId': str(uuid.uuid4()), 'orderId': payment['payment_code'], 'lang': 'vi'}
    payload['signature'] = _signature({'accessKey': config['access_key'], **{key: payload[key] for key in ('orderId', 'partnerCode', 'requestId')}}, config['secret_key'])
    result = _momo_post(config['query_url'], payload)
    if result.get('partnerCode') != config['partner_code'] or result.get('orderId') != payment['payment_code'] or _amount(result.get('amount')) != _amount(payment['amount']):
        raise AppException(ErrorCode.PAYMENT_WEBHOOK_UNAUTHORIZED, message='Thông tin giao dịch MoMo không khớp với đơn.')
    if result.get('resultCode') != 0 or not result.get('transId'):
        if result.get('resultCode') in MOMO_FINAL_FAILURE_CODES:
            failed = _fail_momo(payment, result['resultCode'], current_user['sub'])
            return {'success': False, 'payment_status': failed['payment_status'], 'message': 'Giao dịch MoMo không thành công. Bạn có thể tạo giao dịch mới hoặc chọn phương thức khác.'}
        return {'success': False, 'payment_status': payment['payment_status'], 'message': 'Chưa ghi nhận thanh toán MoMo thành công. Vui lòng kiểm tra lại sau.'}
    _settle(payment, f'MOMO:{result["transId"]}', current_user['sub'])
    return {'success': True, 'payment_status': 'PAID'}


def handle_momo_webhook(payload):
    config = _momo_config()
    data = payload.model_dump()
    signed = {key: data[key] for key in ('amount', 'extraData', 'message', 'orderId', 'orderInfo', 'orderType', 'partnerCode', 'payType', 'requestId', 'responseTime', 'resultCode', 'transId')}
    expected = _signature({'accessKey': config['access_key'], **signed}, config['secret_key'])
    if data['partnerCode'] != config['partner_code'] or not secrets.compare_digest(data['signature'], expected):
        raise AppException(ErrorCode.PAYMENT_WEBHOOK_UNAUTHORIZED)
    payment = repository.get_payment_by_code(data['orderId'])
    if not payment or _metadata(payment).get('provider') != 'MOMO' or _metadata(payment).get('request_id') != data['requestId'] or _amount(data['amount']) != _amount(payment['amount']):
        raise AppException(ErrorCode.PAYMENT_WEBHOOK_UNAUTHORIZED)
    if data['resultCode'] == 0 and data['transId']:
        _settle(payment, f'MOMO:{data["transId"]}')
    elif data['resultCode'] in MOMO_FINAL_FAILURE_CODES:
        _fail_momo(payment, data['resultCode'])
