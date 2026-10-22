import logging
import uuid
from datetime import datetime, timezone
from app.db.database import supabase
from app.auth.repository import USERS_TABLE

logger = logging.getLogger(__name__)

NOTIFICATIONS_TABLE = "notifications"

# Bộ nhớ đệm tạm thời dự phòng trong trường hợp bảng DB chưa được tạo
_MEMORY_NOTIFICATIONS: list[dict] = []


def _format_record(item: dict) -> dict:
    return {
        "id": str(item.get("id")),
        "user_id": str(item.get("user_id")),
        "title": str(item.get("title", "")),
        "body": str(item.get("body", "")),
        "type": str(item.get("type", "GENERAL")),
        "role": str(item.get("role", "USER")),
        "data": item.get("data") if isinstance(item.get("data"), dict) else {},
        "is_read": bool(item.get("is_read", False)),
        "read_at": item.get("read_at"),
        "created_at": item.get("created_at") or datetime.now(timezone.utc).isoformat(),
        "created_by": str(item.get("created_by", "SYSTEM")),
    }


def create_notification(data: dict) -> dict:
    notification_id = data.get("id") or str(uuid.uuid4())
    record = {
        "id": notification_id,
        "user_id": data["user_id"],
        "title": data["title"],
        "body": data["body"],
        "type": data.get("type", "GENERAL"),
        "role": data.get("role", "USER"),
        "data": data.get("data", {}),
        "is_read": False,
        "read_at": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": data.get("created_by", "SYSTEM"),
    }

    try:
        res = supabase.table(NOTIFICATIONS_TABLE).insert(record).execute()
        if res and res.data:
            return _format_record(res.data[0])
    except Exception as exc:
        err_str = str(exc)
        if "PGRST205" in err_str or "schema cache" in err_str:
            logger.warning("Bảng notifications chưa được tạo trên Supabase, lưu vào bộ nhớ tạm: %s", err_str)
        else:
            logger.error("Lỗi khi thêm thông báo vào DB: %s", exc)

    # Lưu dự phòng vào memory
    _MEMORY_NOTIFICATIONS.insert(0, record)
    return _format_record(record)


def get_notifications_by_user(
    user_id: str,
    *,
    is_read: bool | None = None,
    page: int = 1,
    limit: int = 20,
) -> tuple[list[dict], int]:
    try:
        query = supabase.table(NOTIFICATIONS_TABLE).select("*", count="exact").eq("user_id", user_id)
        if is_read is not None:
            query = query.eq("is_read", is_read)
        
        offset = (page - 1) * limit
        res = query.order("created_at", desc=True).range(offset, offset + limit - 1).execute()
        if res:
            items = [_format_record(x) for x in (res.data or [])]
            return items, res.count or len(items)
    except Exception as exc:
        err_str = str(exc)
        if "PGRST205" in err_str or "schema cache" in err_str:
            pass
        else:
            logger.error("Lỗi khi lấy thông báo từ DB: %s", exc)

    # Fallback memory
    user_items = [x for x in _MEMORY_NOTIFICATIONS if x["user_id"] == user_id]
    if is_read is not None:
        user_items = [x for x in user_items if x["is_read"] == is_read]
    
    total = len(user_items)
    offset = (page - 1) * limit
    paginated = user_items[offset : offset + limit]
    return [_format_record(x) for x in paginated], total


def count_unread_by_user(user_id: str) -> int:
    try:
        res = (
            supabase.table(NOTIFICATIONS_TABLE)
            .select("id", count="exact")
            .eq("user_id", user_id)
            .eq("is_read", False)
            .execute()
        )
        if res and res.count is not None:
            return res.count
    except Exception as exc:
        err_str = str(exc)
        if "PGRST205" in err_str or "schema cache" in err_str:
            pass
        else:
            logger.error("Lỗi khi đếm thông báo chưa đọc từ DB: %s", exc)

    return len([x for x in _MEMORY_NOTIFICATIONS if x["user_id"] == user_id and not x["is_read"]])


def mark_notification_as_read(notification_id: str, user_id: str) -> bool:
    now = datetime.now(timezone.utc).isoformat()
    try:
        res = (
            supabase.table(NOTIFICATIONS_TABLE)
            .update({"is_read": True, "read_at": now})
            .eq("id", notification_id)
            .eq("user_id", user_id)
            .execute()
        )
        if res and res.data:
            return True
    except Exception as exc:
        err_str = str(exc)
        if "PGRST205" in err_str or "schema cache" in err_str:
            pass
        else:
            logger.error("Lỗi khi đánh dấu thông báo đã đọc trong DB: %s", exc)

    # Fallback memory
    for item in _MEMORY_NOTIFICATIONS:
        if item["id"] == notification_id and item["user_id"] == user_id:
            item["is_read"] = True
            item["read_at"] = now
            return True
    return False


def mark_all_notifications_as_read(user_id: str) -> int:
    now = datetime.now(timezone.utc).isoformat()
    try:
        res = (
            supabase.table(NOTIFICATIONS_TABLE)
            .update({"is_read": True, "read_at": now})
            .eq("user_id", user_id)
            .eq("is_read", False)
            .execute()
        )
        if res and res.data:
            return len(res.data)
    except Exception as exc:
        err_str = str(exc)
        if "PGRST205" in err_str or "schema cache" in err_str:
            pass
        else:
            logger.error("Lỗi khi đánh dấu tất cả thông báo đã đọc trong DB: %s", exc)

    # Fallback memory
    count = 0
    for item in _MEMORY_NOTIFICATIONS:
        if item["user_id"] == user_id and not item["is_read"]:
            item["is_read"] = True
            item["read_at"] = now
            count += 1
    return count


def get_all_admin_user_ids() -> list[str]:
    """Lấy danh sách user_id của tất cả Quản trị viên (ADMIN)"""
    try:
        # Lấy từ roles và users
        res = supabase.table(USERS_TABLE).select("id,role:roles(code)").eq("is_active", True).execute()
        admin_ids = []
        if res and res.data:
            for u in res.data:
                role_info = u.get("role") or {}
                if role_info.get("code") == "ADMIN" or u.get("role_id") == "ROLEADMIN1":
                    admin_ids.append(u["id"])
            if admin_ids:
                return admin_ids
    except Exception as exc:
        logger.error("Lỗi lấy danh sách admin: %s", exc)
    
    # Fallback ID admin mặc định
    return ["ADMIN0001", "ADM0000002"]
