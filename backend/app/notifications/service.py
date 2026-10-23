import logging
from typing import Any
from app.notifications import repository
from app.notifications.schemas import (
    NotificationListResponse,
    NotificationResponse,
    NotificationUnreadCountResponse,
    NotificationMarkReadResponse,
)

logger = logging.getLogger(__name__)


def _bootstrap_notifications_for_user(user_id: str, role_id: str):
    # Đồng bộ thông báo mẫu cho người dùng chưa có dữ liệu.
    try:
        from app.db.database import supabase
        # 1. Khách hàng
        reqs = (
            supabase.table("repair_requests")
            .select("id,status,issue_type,location_address,is_sos,created_at")
            .eq("customer_id", user_id)
            .order("created_at", desc=True)
            .limit(5)
            .execute()
        )
        if reqs and reqs.data:
            for r in reqs.data:
                status = r.get("status", "REQUESTED")
                req_id = r.get("id")
                issue = r.get("issue_type", "Sự cố")
                title = "Đơn sửa chữa đã được tiếp nhận"
                body = f"Đơn cứu hộ #{req_id} ({issue}) đã được hệ thống ghi nhận."
                if status == "COMPLETED":
                    title = "Sửa chữa hoàn tất"
                    body = f"Đơn #{req_id} đã được sửa chữa xong thành công. Cảm ơn bạn đã đồng hành cùng V-HCare."
                elif status in {"WAITING_FOR_APPROVAL", "ESTIMATE_SUBMITTED"}:
                    title = "Yêu cầu phê duyệt báo giá sửa chữa"
                    body = f"Kỹ thuật viên đã gửi báo giá cho đơn #{req_id}. Vui lòng kiểm tra và xác nhận chi phí."
                elif status == "ESTIMATE_APPROVED":
                    title = "Báo giá sửa chữa đã được duyệt"
                    body = f"Kỹ thuật viên đang tiến hành sửa chữa phương tiện cho đơn #{req_id}."
                elif status in {"EN_ROUTE", "ARRIVED"}:
                    title = "Kỹ thuật viên đang di chuyển tới"
                    body = f"Thợ đang trên đường đến điểm hẹn đơn #{req_id}."
                elif status == "CANCELLED":
                    title = "Đơn sửa chữa đã huỷ"
                    body = f"Đơn #{req_id} đã được huỷ."

                repository.create_notification({
                    "user_id": user_id,
                    "title": title,
                    "body": body,
                    "type": status,
                    "role": "USER",
                    "data": {"repair_id": req_id, "url": f"/home/history/{req_id}"},
                })
        else:
            # 2. Kiểm tra nếu là Kỹ thuật viên (Technician)
            tech_reqs = (
                supabase.table("repair_requests")
                .select("id,status,issue_type,location_address,is_sos,created_at")
                .eq("technician_id", user_id)
                .order("created_at", desc=True)
                .limit(5)
                .execute()
            )
            if tech_reqs and tech_reqs.data:
                for r in tech_reqs.data:
                    status = r.get("status", "ASSIGNED")
                    req_id = r.get("id")
                    title = "Nhiệm vụ sửa chữa được phân công"
                    body = f"Đơn #{req_id} tại {r.get('location_address', 'điểm hẹn')}."
                    if status == "COMPLETED":
                        title = "Hoàn tất đơn sửa chữa"
                        body = f"Đơn #{req_id} đã được ghi nhận hoàn thành."
                    elif status == "ESTIMATE_APPROVED":
                        title = "Khách hàng ĐÃ ĐỒNG Ý báo giá"
                        body = f"Khách hàng đã chấp thuận chi phí cho đơn #{req_id}."
                    repository.create_notification({
                        "user_id": user_id,
                        "title": title,
                        "body": body,
                        "type": status,
                        "role": "TECHNICIAN",
                        "data": {"repair_id": req_id, "url": "/"},
                    })
            elif role_id in {"ROLEADMIN1", "ROLE000001"}:
                # 3. Quản trị viên (Admin)
                recent_reqs = (
                    supabase.table("repair_requests")
                    .select("id,status,issue_type,location_address,is_sos,created_at")
                    .order("created_at", desc=True)
                    .limit(3)
                    .execute()
                )
                if recent_reqs and recent_reqs.data:
                    for r in recent_reqs.data:
                        req_id = r.get("id")
                        repository.create_notification({
                            "user_id": user_id,
                            "title": f"Theo dõi đơn #{req_id}",
                            "body": f"Đơn {r.get('issue_type', 'sửa chữa')} tại {r.get('location_address', '')}.",
                            "type": r.get("status", "REQUESTED"),
                            "role": "ADMIN",
                            "data": {"repair_id": req_id, "url": "/dashboard"},
                        })
                else:
                    repository.create_notification({
                        "user_id": user_id,
                        "title": "Hệ thống quản trị V-HCare sẵn sàng",
                        "body": "Đang theo dõi vận hành dịch vụ cứu hộ và điều phối kỹ thuật viên 24/7.",
                        "type": "SYSTEM_ALERT",
                        "role": "ADMIN",
                        "data": {"url": "/"},
                    })
            else:
                repository.create_notification({
                    "user_id": user_id,
                    "title": "Chào mừng bạn đến với V-HCare!",
                    "body": "Dịch vụ cứu hộ & sửa chữa xe lăn, xe máy điện tận nơi 24/7 sẵn sàng phục vụ bạn.",
                    "type": "SYSTEM_ALERT",
                    "role": "USER",
                    "data": {"url": "/home"},
                })
    except Exception as exc:
        logger.warning("Failed to bootstrap notifications for user %s: %s", user_id, exc)


def list_my_notifications(
    current_user: dict,
    *,
    is_read: bool | None = None,
    page: int = 1,
    limit: int = 20,
) -> NotificationListResponse:
    user_id = current_user["sub"]
    role = current_user.get("role")
    items_raw, total = repository.get_notifications_by_user(
        user_id, role=role, is_read=is_read, page=page, limit=limit
    )
    if total == 0:
        _bootstrap_notifications_for_user(user_id, current_user.get("role_id", ""))
        items_raw, total = repository.get_notifications_by_user(
            user_id, role=role, is_read=is_read, page=page, limit=limit
        )

    unread_count = repository.count_unread_by_user(user_id, role=role)
    items = [NotificationResponse(**x) for x in items_raw]
    return NotificationListResponse(
        items=items,
        total=total,
        page=page,
        limit=limit,
        unread_count=unread_count,
    )


def get_my_unread_count(current_user: dict) -> NotificationUnreadCountResponse:
    user_id = current_user["sub"]
    role = current_user.get("role")
    count = repository.count_unread_by_user(user_id, role=role)
    if count == 0:
        items_raw, total = repository.get_notifications_by_user(user_id, role=role, limit=1)
        if total == 0:
            _bootstrap_notifications_for_user(user_id, current_user.get("role_id", ""))
            count = repository.count_unread_by_user(user_id, role=role)
    return NotificationUnreadCountResponse(unread_count=count)


def mark_my_notification_read(notification_id: str, current_user: dict) -> NotificationMarkReadResponse:
    user_id = current_user["sub"]
    success = repository.mark_notification_as_read(notification_id, user_id, role=current_user.get("role"))
    return NotificationMarkReadResponse(
        success=success,
        message="Đã đánh dấu đã đọc" if success else "Không tìm thấy thông báo hoặc đã đọc",
    )


def mark_all_my_notifications_read(current_user: dict) -> NotificationMarkReadResponse:
    user_id = current_user["sub"]
    count = repository.mark_all_notifications_as_read(user_id, role=current_user.get("role"))
    return NotificationMarkReadResponse(
        success=True,
        message=f"Đã đánh dấu {count} thông báo là đã đọc",
    )


# =========================================================================
# Domain Event Triggers for 3 roles: USER (Customer), TECHNICIAN, ADMIN
# =========================================================================

def notify_user(
    user_id: str,
    title: str,
    body: str,
    type_code: str,
    role: str = "USER",
    data: dict[str, Any] | None = None,
):
    try:
        repository.create_notification({
            "user_id": user_id,
            "title": title,
            "body": body,
            "type": type_code,
            "role": role,
            "data": data or {},
        })
    except Exception as exc:
        logger.error("Lỗi khi gửi thông báo tới user %s: %s", user_id, exc)


def notify_admins(
    title: str,
    body: str,
    type_code: str,
    data: dict[str, Any] | None = None,
):
    try:
        admin_ids = repository.get_all_admin_user_ids()
        for admin_id in admin_ids:
            repository.create_notification({
                "user_id": admin_id,
                "title": title,
                "body": body,
                "type": type_code,
                "role": "ADMIN",
                "data": data or {},
            })
    except Exception as exc:
        logger.error("Lỗi khi gửi thông báo tới admins: %s", exc)


def notify_request_created(request_dict: dict):
    req_id = request_dict.get("id", "")
    customer_id = request_dict.get("customer_id", "")
    issue_type = request_dict.get("issue_type", "Sự cố")
    is_sos = request_dict.get("is_sos", False)
    address = request_dict.get("location_address", "")

    prefix = "[KHẨN CẤP] " if is_sos else ""

    # 1. Thông báo cho Khách hàng
    if customer_id:
        notify_user(
            user_id=customer_id,
            title="Đơn sửa chữa đã được tiếp nhận",
            body=f"Hệ thống đã ghi nhận yêu cầu cứu hộ #{req_id} ({issue_type}). Đang tìm kiếm kỹ thuật viên gần nhất.",
            type_code="REQUEST_CREATED",
            role="USER",
            data={"repair_id": req_id, "url": f"/home/history/{req_id}"},
        )

    # 2. Thông báo cho Quản trị viên (Admin)
    notify_admins(
        title=f"{prefix}Đơn sửa chữa mới #{req_id}",
        body=f"Khách hàng vừa tạo đơn {issue_type} tại {address}. Cần theo dõi tiếp nhận.",
        type_code="REQUEST_CREATED",
        data={"repair_id": req_id, "url": "/dashboard"},
    )


def notify_request_assigned(request_dict: dict, technician_id: str):
    req_id = request_dict.get("id", "")
    customer_id = request_dict.get("customer_id", "")
    address = request_dict.get("location_address", "")
    is_sos = request_dict.get("is_sos", False)
    prefix = "[SOS] " if is_sos else ""

    # 1. Thông báo cho Kỹ thuật viên
    if technician_id:
        notify_user(
            user_id=technician_id,
            title=f"{prefix}Bạn có nhiệm vụ sửa chữa mới!",
            body=f"Đơn #{req_id} tại {address} đã được chỉ định cho bạn. Vui lòng xác nhận tiếp nhận.",
            type_code="REQUEST_ASSIGNED",
            role="TECHNICIAN",
            data={"repair_id": req_id, "url": "/"},
        )

    # 2. Thông báo cho Khách hàng
    if customer_id:
        notify_user(
            user_id=customer_id,
            title="Đã phân công kỹ thuật viên",
            body=f"Kỹ thuật viên đã được chỉ định cho đơn #{req_id} và sẽ sớm di chuyển đến điểm hẹn.",
            type_code="REQUEST_ASSIGNED",
            role="USER",
            data={"repair_id": req_id, "url": f"/home/history/{req_id}"},
        )


def notify_status_changed(
    request_dict: dict,
    new_status: str,
    old_status: str | None = None,
    note: str | None = None,
):
    req_id = request_dict.get("id", "")
    customer_id = request_dict.get("customer_id", "")
    technician_id = request_dict.get("technician_id")

    # Bản đồ thông báo theo từng trạng thái
    status_messages = {
        "ACCEPTED": {
            "title_user": "Kỹ thuật viên đã nhận việc",
            "body_user": f"Thợ đang chuẩn bị trang thiết bị để xuất phát đến điểm hẹn đơn #{req_id}.",
            "title_admin": f"Thợ đã nhận đơn #{req_id}",
            "body_admin": f"Kỹ thuật viên đã xác nhận tiếp nhận đơn #{req_id}.",
        },
        "REJECTED": {
            "title_user": "Kỹ thuật viên bận",
            "body_user": f"Kỹ thuật viên không thể nhận đơn #{req_id}. Hệ thống đang tự động điều phối thợ khác.",
            "title_admin": f"Thợ từ chối đơn #{req_id}",
            "body_admin": f"Kỹ thuật viên {technician_id} đã từ chối nhận việc. Cần kiểm tra điều phối lại.",
        },
        "EN_ROUTE": {
            "title_user": "Kỹ thuật viên đang trên đường tới",
            "body_user": f"Thợ đang di chuyển đến vị trí của bạn cho đơn #{req_id}. Vui lòng chú ý điện thoại.",
            "title_admin": f"Thợ đang di chuyển (#{req_id})",
            "body_admin": f"KTV bắt đầu di chuyển tới điểm hẹn đơn #{req_id}.",
        },
        "ARRIVED": {
            "title_user": "Kỹ thuật viên đã đến điểm hẹn",
            "body_user": f"Thợ đã có mặt tại địa điểm sửa chữa đơn #{req_id}.",
            "title_admin": f"Thợ đã tới nơi (#{req_id})",
            "body_admin": f"KTV đã check-in tại địa điểm của khách hàng.",
        },
        "DIAGNOSING": {
            "title_user": "Đang kiểm tra & chẩn đoán xe",
            "body_user": f"Thợ đang tiến hành kiểm tra tình trạng thiết bị cho đơn #{req_id}.",
            "title_admin": f"Đang chẩn đoán (#{req_id})",
            "body_admin": f"KTV đang chẩn đoán thiết bị cho đơn #{req_id}.",
        },
        "REPAIRING": {
            "title_user": "Bắt đầu tiến trình sửa chữa",
            "body_user": f"Thợ bắt đầu thao tác sửa chữa phương tiện sau khi đã thống nhất chi phí.",
            "title_admin": f"Đang sửa chữa (#{req_id})",
            "body_admin": f"KTV đang tiến hành sửa chữa cho đơn #{req_id}.",
        },
        "COMPLETED": {
            "title_user": "Sửa chữa hoàn tất!",
            "body_user": f"Phương tiện đơn #{req_id} đã được sửa xong. Vui lòng kiểm tra và thanh toán dịch vụ.",
            "title_tech": "Hoàn tất đơn sửa chữa",
            "body_tech": f"Đơn #{req_id} đã được xác nhận hoàn tất thành công.",
            "title_admin": f"Đơn #{req_id} đã hoàn tất",
            "body_admin": f"KTV đã sửa chữa xong đơn #{req_id}, đang chờ khách nghiệm thu và thanh toán.",
        },
        "CANCELLED": {
            "title_user": "Đơn sửa chữa đã bị huỷ",
            "body_user": f"Đơn #{req_id} đã bị huỷ. Lý do: {note or 'Không xác định'}.",
            "title_tech": "Đơn việc đã bị huỷ",
            "body_tech": f"Đơn #{req_id} đã bị huỷ. Lý do: {note or 'Khách hàng hoặc hệ thống huỷ'}.",
            "title_admin": f"Đơn #{req_id} bị huỷ",
            "body_admin": f"Đơn #{req_id} đã bị huỷ. Lý do: {note or 'Không xác định'}.",
        },
    }

    cfg = status_messages.get(new_status)
    if not cfg:
        return

    # 1. Gửi cho Khách hàng
    if customer_id and "title_user" in cfg:
        notify_user(
            user_id=customer_id,
            title=cfg["title_user"],
            body=cfg["body_user"],
            type_code=new_status,
            role="USER",
            data={"repair_id": req_id, "url": f"/home/history/{req_id}"},
        )

    # 2. Gửi cho Thợ (nếu có thông báo riêng cho thợ)
    if technician_id and "title_tech" in cfg:
        notify_user(
            user_id=technician_id,
            title=cfg["title_tech"],
            body=cfg["body_tech"],
            type_code=new_status,
            role="TECHNICIAN",
            data={"repair_id": req_id, "url": "/"},
        )

    # 3. Gửi cho Admin (nếu có)
    if "title_admin" in cfg:
        notify_admins(
            title=cfg["title_admin"],
            body=cfg["body_admin"],
            type_code=new_status,
            data={"repair_id": req_id, "url": "/dashboard"},
        )


def notify_quote_submitted(request_dict: dict, quote_dict: dict):
    req_id = request_dict.get("id", "")
    customer_id = request_dict.get("customer_id", "")
    labor_fee = int(float(quote_dict.get("labor_fee", 0)))
    parts_cost = int(float(quote_dict.get("parts_cost", 0)))
    estimated_price = int(float(quote_dict.get("estimated_price", 0))) or (labor_fee + parts_cost)

    formatted_price = f"{estimated_price:,.0f} đ".replace(",", ".")

    # 1. Gửi cho Khách hàng
    if customer_id:
        notify_user(
            user_id=customer_id,
            title="Yêu cầu phê duyệt báo giá sửa chữa",
            body=f"Kỹ thuật viên đã gửi báo giá ước tính: {formatted_price}. Vui lòng xem chi tiết và xác nhận.",
            type_code="ESTIMATE_SUBMITTED",
            role="USER",
            data={"repair_id": req_id, "quote_id": quote_dict.get("id"), "url": f"/home/history/{req_id}"},
        )

    # 2. Gửi cho Admin
    notify_admins(
        title=f"Báo giá mới cho đơn #{req_id}",
        body=f"KTV vừa gửi báo giá {formatted_price} cho khách hàng.",
        type_code="ESTIMATE_SUBMITTED",
        data={"repair_id": req_id, "url": "/dashboard"},
    )


def notify_quote_response(
    request_dict: dict,
    quote_dict: dict,
    approved: bool,
    reject_reason: str | None = None,
):
    req_id = request_dict.get("id", "")
    technician_id = request_dict.get("technician_id")

    if not technician_id:
        return

    if approved:
        notify_user(
            user_id=technician_id,
            title="Khách hàng ĐÃ ĐỒNG Ý báo giá",
            body=f"Khách hàng đã chấp thuận phương án chi phí cho đơn #{req_id}. Bạn có thể bắt đầu sửa chữa.",
            type_code="ESTIMATE_APPROVED",
            role="TECHNICIAN",
            data={"repair_id": req_id, "url": "/"},
        )
    else:
        notify_user(
            user_id=technician_id,
            title="Khách hàng TỪ CHỐI báo giá",
            body=f"Khách đã từ chối báo giá đơn #{req_id}. Lý do: {reject_reason or 'Không đồng ý chi phí'}.",
            type_code="ESTIMATE_REJECTED",
            role="TECHNICIAN",
            data={"repair_id": req_id, "url": "/"},
        )


def notify_payment_success(
    repair_id: str,
    customer_id: str,
    technician_id: str | None,
    amount: float | int | str,
    method: str = "ONLINE",
):
    try:
        amt_num = int(float(amount))
        amt_str = f"{amt_num:,.0f} đ".replace(",", ".")
    except Exception:
        amt_str = f"{amount} đ"

    # 1. Khách hàng
    if customer_id:
        notify_user(
            user_id=customer_id,
            title="Thanh toán thành công!",
            body=f"Bạn đã thanh toán thành công {amt_str} cho đơn #{repair_id} ({method}). Cảm ơn bạn đã sử dụng V-HCare!",
            type_code="PAYMENT_SUCCESS",
            role="USER",
            data={"repair_id": repair_id, "url": f"/home/history/{repair_id}"},
        )

    # 2. Thợ
    if technician_id:
        notify_user(
            user_id=technician_id,
            title="Đơn hàng đã được thanh toán",
            body=f"Khách hàng đã thanh toán {amt_str} cho đơn #{repair_id}. Thu nhập đã được ghi nhận.",
            type_code="PAYMENT_SUCCESS",
            role="TECHNICIAN",
            data={"repair_id": repair_id, "url": "/"},
        )

    # 3. Admin
    notify_admins(
        title=f"Thanh toán đơn #{repair_id}: {amt_str}",
        body=f"Giao dịch thành công qua phương thức {method}.",
        type_code="PAYMENT_SUCCESS",
        data={"repair_id": repair_id, "url": "/dashboard"},
    )


def notify_review_received(
    repair_id: str,
    technician_id: str,
    rating: int | float,
    comment: str | None = None,
):
    if not technician_id:
        return
    comment_snippet = f': "{comment}"' if comment else ""
    notify_user(
        user_id=technician_id,
        title=f"Bạn nhận được đánh giá {rating} sao!",
        body=f"Khách hàng đơn #{repair_id} vừa gửi đánh giá {rating} sao{comment_snippet}.",
        type_code="REVIEW_SUBMITTED",
        role="TECHNICIAN",
        data={"repair_id": repair_id, "url": "/"},
    )
