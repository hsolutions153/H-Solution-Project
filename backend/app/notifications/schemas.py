from datetime import datetime
from typing import Any
from pydantic import BaseModel, Field


class NotificationBase(BaseModel):
    title: str = Field(..., max_length=255, description="Tiêu đề thông báo")
    body: str = Field(..., description="Nội dung chi tiết thông báo")
    type: str = Field(..., max_length=50, description="Mã loại thông báo")
    role: str = Field(default="USER", max_length=20, description="Đối tượng nhận: USER, TECHNICIAN, ADMIN")
    data: dict[str, Any] = Field(default_factory=dict, description="Dữ liệu đính kèm (orderId, url, ...)")


class NotificationCreate(NotificationBase):
    user_id: str = Field(..., max_length=10, description="ID người nhận")


class NotificationResponse(NotificationBase):
    id: str
    user_id: str
    is_read: bool
    read_at: datetime | None = None
    created_at: datetime
    created_by: str = "SYSTEM"


class NotificationListResponse(BaseModel):
    items: list[NotificationResponse]
    total: int
    page: int
    limit: int
    unread_count: int


class NotificationUnreadCountResponse(BaseModel):
    unread_count: int


class NotificationMarkReadResponse(BaseModel):
    success: bool
    message: str
