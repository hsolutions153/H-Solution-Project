import secrets
from datetime import datetime, timezone

from app.auth import repository as auth_repository
from app.completions import repository
from app.completions.models import ALLOWED_COMPLETION_STATUS
from app.core.exceptions import AppException, ErrorCode
from app.customers.models import ADMIN_ROLE_CODE
from app.repair_requests.models import TECHNICIAN_ROLE_CODE


def _gen_id() -> str:
    return secrets.token_hex(5).upper()


def _role_id(code: str) -> str:
    role = auth_repository.get_role_by_code(code)
    if not role:
        raise AppException(ErrorCode.ROLE_NOT_CONFIGURED)
    return role[0]["id"] if isinstance(role, list) else role["id"]


def _is_role(current_user: dict, code: str) -> bool:
    if current_user.get("role") == code:
        return True
    try:
        return current_user.get("role_id") == _role_id(code)
    except Exception:
        return False


def confirm_completion(current_user: dict, data):
    request = repository.get_repair_request_by_id(data.request_id)
    if not request:
        raise AppException(ErrorCode.REQUEST_NOT_FOUND)

    # Chỉ thợ được phân công mới được xác nhận hoàn tất
    is_assigned_tech = (
        _is_role(current_user, TECHNICIAN_ROLE_CODE)
        and request.get("technician_id") == current_user["sub"]
    )
    if not is_assigned_tech and not _is_role(current_user, ADMIN_ROLE_CODE):
        raise AppException(ErrorCode.FORBIDDEN)

    # Phải đang ở trạng thái REPAIRING mới được hoàn tất
    if request["status"] not in ALLOWED_COMPLETION_STATUS:
        raise AppException(
            ErrorCode.INVALID_STATUS_TRANSITION,
            message="Chỉ có thể xác nhận hoàn tất khi đơn đang ở trạng thái REPAIRING",
        )

    now = datetime.now(timezone.utc).isoformat()

    # Cập nhật đơn COMPLETED + chi phí thực tế + thời gian hoàn thành
    updated = repository.update_repair_request(data.request_id, {
        "status": "COMPLETED",
        "total_amount": float(data.final_cost),
        "completed_at": now,
        "updated_at": now,
        "updated_by": current_user["sub"],
    })
    if not updated:
        raise AppException(ErrorCode.INTERNAL_SERVER_ERROR)

    # Lưu ảnh sau sửa chữa
    for url in data.after_images:
        repository.create_repair_image({
            "id": _gen_id(),
            "repair_id": data.request_id,
            "image_url": url,
            "image_type": "AFTER_REPAIR",
            "description": "Ảnh sau khi sửa chữa",
            "created_by": current_user["sub"],
        })

    # Ghi lịch sử thay đổi trạng thái
    repository.add_status_history({
        "id": _gen_id(),
        "repair_id": data.request_id,
        "status": "COMPLETED",
        "changed_by": current_user["sub"],
        "note": f"Kỹ thuật viên xác nhận hoàn tất. Chi phí thực tế: {float(data.final_cost):,.0f} VND",
        "changed_at": now,
    })

    return updated
