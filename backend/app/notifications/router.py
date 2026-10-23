from fastapi import APIRouter, Depends, Query, status
from app.auth.utils import get_current_user
from app.notifications import service
from app.notifications.schemas import (
    NotificationListResponse,
    NotificationUnreadCountResponse,
    NotificationMarkReadResponse,
)

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("/me", response_model=NotificationListResponse)
def get_my_notifications(
    is_read: bool | None = Query(default=None, description="Lọc theo trạng thái đã đọc/chưa đọc"),
    page: int = Query(default=1, ge=1, description="Số trang"),
    limit: int = Query(default=20, ge=1, le=100, description="Số lượng mỗi trang"),
    current_user: dict = Depends(get_current_user),
):
    return service.list_my_notifications(
        current_user,
        is_read=is_read,
        page=page,
        limit=limit,
    )


@router.get("/unread-count", response_model=NotificationUnreadCountResponse)
def get_unread_count(
    current_user: dict = Depends(get_current_user),
):
    # Lấy số thông báo chưa đọc cho badge.
    return service.get_my_unread_count(current_user)


@router.put("/{notification_id}/read", response_model=NotificationMarkReadResponse)
def mark_notification_as_read(
    notification_id: str,
    current_user: dict = Depends(get_current_user),
):
    # Đánh dấu một thông báo là đã đọc.
    return service.mark_my_notification_read(notification_id, current_user)


@router.put("/read-all", response_model=NotificationMarkReadResponse)
def mark_all_notifications_as_read(
    current_user: dict = Depends(get_current_user),
):
    # Đánh dấu toàn bộ thông báo là đã đọc.
    return service.mark_all_my_notifications_read(current_user)
