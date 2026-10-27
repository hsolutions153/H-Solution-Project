from app.db.database import supabase
from app.technicians.ratings import sync_technician_rating
from app.repair_requests.models import (
    CUSTOMER_DEVICES_TABLE,
    REPAIR_IMAGES_TABLE,
    REPAIR_QUOTES_TABLE,
    REPAIR_REQUESTS_TABLE,
    STATUS_HISTORY_TABLE,
)


def save_review(data: dict):
    import secrets
    existing = supabase.table("reviews").select("id").eq("repair_id", data["repair_id"]).maybe_single().execute()
    record = dict(data)
    record["id"] = existing.data["id"] if existing and existing.data else secrets.token_hex(5).upper()
    if not (existing and existing.data):
        record["created_by"] = data["customer_id"]
    result = supabase.table("reviews").upsert(record, on_conflict="repair_id").execute()
    if result and result.data:
        sync_technician_rating(data["technician_id"])
    return result.data[0] if result and result.data else None


def get_device_for_customer(device_id: str, customer_id: str):
    response = (
        supabase.table(CUSTOMER_DEVICES_TABLE)
        .select("id,device_type")
        .eq("id", device_id)
        .eq("customer_id", customer_id)
        .maybe_single()
        .execute()
    )
    return response.data if response and hasattr(response, "data") else None


def get_technician_profile(user_id: str):
    response = (
        supabase.table("technician_profiles")
        .select("*")
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )
    return response.data if response and hasattr(response, "data") else None


def get_any_device_for_customer(customer_id: str):
    response = (
        supabase.table(CUSTOMER_DEVICES_TABLE)
        .select("id")
        .eq("customer_id", customer_id)
        .limit(1)
        .execute()
    )
    return response.data[0]["id"] if response and response.data else None


def get_device_type(device_id: str | None):
    if not device_id:
        return None
    response = (
        supabase.table(CUSTOMER_DEVICES_TABLE)
        .select("device_type")
        .eq("id", device_id)
        .maybe_single()
        .execute()
    )
    return response.data.get("device_type") if response and response.data else None


def create_default_device_for_customer(customer_id: str):
    import secrets
    new_id = secrets.token_hex(5).upper()
    data = {
        "id": new_id,
        "customer_id": customer_id,
        "device_type": "SCOOTER",
        "manufacturer": "Chưa xác định",
        "model_name": "Xe máy điện",
        "notes": "Phương tiện tự động tạo khi đặt lịch",
        "created_by": customer_id,
        "updated_by": customer_id,
    }
    supabase.table(CUSTOMER_DEVICES_TABLE).insert(data).execute()
    return new_id


def create_repair_request(data: dict):
    response = supabase.table(REPAIR_REQUESTS_TABLE).insert(data).execute()
    return response.data[0] if response and response.data else None


def find_recent_open_request(customer_id: str, device_id: str, is_sos: bool, created_after: str):
    response = (
        supabase.table(REPAIR_REQUESTS_TABLE)
        .select("*")
        .eq("customer_id", customer_id)
        .eq("device_id", device_id)
        .eq("is_sos", is_sos)
        .not_.in_("status", ["COMPLETED", "CANCELLED"])
        .gte("created_at", created_after)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    return response.data[0] if response and response.data else None


def get_open_customer_requests(customer_id: str):
    base_query = supabase.table(REPAIR_REQUESTS_TABLE).eq("customer_id", customer_id).not_.in_("status", ["COMPLETED", "CANCELLED"])
    try:
        # appointment_key là nguồn định danh chuẩn sau migration.
        response = base_query.select("id,status,issue_description,customer_id,appointment_key").execute()
    except Exception:
        # Tương thích tạm thời với DB chưa áp migration; vẫn đọc được lịch từ
        # ghi chú [Hẹn: ...] để lớp service chặn trùng theo cách cũ.
        response = base_query.select("id,status,issue_description,customer_id").execute()
    return response.data or [] if response else []


def get_technician_requests_in_statuses(technician_id: str, statuses: list[str]):
    response = (
        supabase.table(REPAIR_REQUESTS_TABLE)
        .select("*")
        .eq("technician_id", technician_id)
        .in_("status", statuses)
        .execute()
    )
    return (response.data or []) if response else []


def get_technician_open_requests(technician_id: str):
    response = (
        supabase.table(REPAIR_REQUESTS_TABLE)
        .select("*")
        .eq("technician_id", technician_id)
        .not_.in_("status", ["COMPLETED", "CANCELLED"])
        .execute()
    )
    return (response.data or []) if response else []

def get_repair_request_by_id(request_id: str):
    response = (
        supabase.table(REPAIR_REQUESTS_TABLE)
        .select("*")
        .or_(f"id.eq.{request_id},request_code.eq.{request_id}")
        .maybe_single()
        .execute()
    )
    return response.data if response and hasattr(response, "data") else None


def get_repair_requests(*, customer_id: str | None, technician_id: str | None, request_status: str | None, page: int, limit: int, include_count: bool = True):
    if include_count:
        query = supabase.table(REPAIR_REQUESTS_TABLE).select("*", count="exact")
    else:
        query = supabase.table(REPAIR_REQUESTS_TABLE).select("*")
    if customer_id:
        query = query.eq("customer_id", customer_id)
    if technician_id:
        query = query.eq("technician_id", technician_id)
    if request_status:
        query = query.eq("status", request_status)
    response = query.order("created_at", desc=True).range((page - 1) * limit, page * limit - 1).execute()
    data = response.data or []
    total = response.count if include_count and response.count is not None else ((page - 1) * limit + len(data))
    return data, total


def update_repair_request(request_id: str, data: dict, expected: dict | None = None):
    # Cập nhật đơn có kiểm tra giá trị cũ để tránh ghi đè đồng thời.
    STATUS_MAP = {
        "REJECTED": "REQUESTED",
        "PENDING": "REQUESTED",
        "DIAGNOSED": "DIAGNOSING",
        "DECLINED": "CANCELLED",
    }
    clean_data = dict(data)
    if clean_data.get("status") in STATUS_MAP:
        clean_data["status"] = STATUS_MAP[clean_data["status"]]

    try:
        query = supabase.table(REPAIR_REQUESTS_TABLE).update(clean_data).eq("id", request_id)
        for column, value in (expected or {}).items():
            query = query.is_(column, "null") if value is None else query.eq(column, value)
        response = query.execute()
        return response.data[0] if response and response.data else None
    except Exception as err:
        print(f"update_repair_request failed: {err}")
        return None


def has_accepted_quote(request_id: str) -> bool:
    req = get_repair_request_by_id(request_id)
    if req and (req.get("total_amount") is not None or req.get("is_sos")):
        return True

    try:
        response = (
            supabase.table(REPAIR_QUOTES_TABLE)
            .select("id")
            .eq("repair_id", request_id)
            .limit(1)
            .execute()
        )
        if response and response.data:
            return True
    except Exception:
        pass

    return True


def add_status_history(data: dict):
    STATUS_MAP = {
        "REJECTED": "REQUESTED",
        "PENDING": "REQUESTED",
        "DIAGNOSED": "DIAGNOSING",
        "DECLINED": "CANCELLED",
    }
    clean_data = dict(data)
    if clean_data.get("status") in STATUS_MAP:
        if clean_data.get("status") == "REJECTED" and "note" in clean_data:
            clean_data["note"] = f"[Từ chối nhận việc] {clean_data.get('note') or ''}".strip()
        clean_data["status"] = STATUS_MAP[clean_data["status"]]

    try:
        response = supabase.table(STATUS_HISTORY_TABLE).insert(clean_data).execute()
        return response.data[0] if response and response.data else None
    except Exception as err:
        print(f"Warning: add_status_history failed: {err}")
        return None


def get_status_history(repair_id: str):
    # Bảng lịch sử dùng cột changed_at. Không nuốt lỗi: "không tải được" khác "chưa có lịch sử".
    response = (
        supabase.table(STATUS_HISTORY_TABLE)
        .select("*")
        .eq("repair_id", repair_id)
        .order("changed_at", desc=False)
        .execute()
    )
    return response.data if response and hasattr(response, "data") else []


def create_repair_image(data: dict):
    response = supabase.table(REPAIR_IMAGES_TABLE).insert(data).execute()
    return response.data[0] if response and response.data else None


def get_repair_images(repair_id: str):
    response = (
        supabase.table(REPAIR_IMAGES_TABLE)
        .select("*")
        .eq("repair_id", repair_id)
        .order("created_at", desc=False)
        .execute()
    )
    return response.data if response and hasattr(response, "data") else []


def get_repair_images_by_repair_ids(repair_ids: list[str]):
    if not repair_ids:
        return []
    response = (
        supabase.table(REPAIR_IMAGES_TABLE)
        .select("*")
        .in_("repair_id", repair_ids)
        .order("created_at", desc=False)
        .execute()
    )
    return response.data if response and hasattr(response, "data") else []


def create_quote(data: dict):
    response = supabase.table(REPAIR_QUOTES_TABLE).insert(data).execute()
    return response.data[0] if response and response.data else None


def create_quote_item(data: dict):
    response = supabase.table("repair_quote_items").insert(data).execute()
    return response.data[0] if response and response.data else None


def update_pending_quote(quote_id: str, data: dict):
    # Chỉ sửa được khi khách chưa phản hồi; trả None nếu báo giá đã được duyệt/từ chối
    response = (
        supabase.table(REPAIR_QUOTES_TABLE)
        .update(data)
        .eq("id", quote_id)
        .eq("status", "PENDING")
        .execute()
    )
    return response.data[0] if response and response.data else None


def delete_quote_items_by_ids(item_ids: list[str]):
    if not item_ids:
        return
    supabase.table("repair_quote_items").delete().in_("id", item_ids).execute()


def add_quote_history(data: dict):
    response = supabase.table("quote_history").insert(data).execute()
    return response.data[0] if response and response.data else None


def get_quotes_by_repair_id(repair_id: str):
    response = (
        supabase.table(REPAIR_QUOTES_TABLE)
        .select("*")
        .eq("repair_id", repair_id)
        .order("created_at", desc=True)
        .execute()
    )
    return response.data if response and hasattr(response, "data") else []


def get_quote_items(quote_id: str):
    items = []
    try:
        response = (
            supabase.table("repair_quote_items")
            .select("*")
            .eq("quote_id", quote_id)
            .execute()
        )
        if response and getattr(response, "data", None):
            items = response.data
    except Exception:
        pass

    if not items:
        try:
            response = (
                supabase.table("quote_items")
                .select("*")
                .eq("quote_id", quote_id)
                .execute()
            )
            if response and getattr(response, "data", None):
                items = response.data
        except Exception:
            pass

    for it in items:
        qty = float(it.get("quantity") or 1)
        price = float(it.get("unit_price") or it.get("price") or 0)
        if it.get("subtotal") is None:
            it["subtotal"] = qty * price
        if not it.get("item_name") and it.get("name"):
            it["item_name"] = it["name"]

    return items
