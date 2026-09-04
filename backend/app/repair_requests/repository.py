from app.db.database import supabase
from app.repair_requests.models import (
    CUSTOMER_DEVICES_TABLE,
    REPAIR_IMAGES_TABLE,
    REPAIR_QUOTES_TABLE,
    REPAIR_REQUESTS_TABLE,
    STATUS_HISTORY_TABLE,
)


def get_device_for_customer(device_id: str, customer_id: str):
    response = (
        supabase.table(CUSTOMER_DEVICES_TABLE)
        .select("id")
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


def create_default_device_for_customer(customer_id: str):
    import secrets
    new_id = secrets.token_hex(5).upper()
    data = {
        "id": new_id,
        "customer_id": customer_id,
        "device_type": "WHEELCHAIR",
        "manufacturer": "Generic",
        "model_name": "Electric Wheelchair",
        "created_by": customer_id,
        "updated_by": customer_id,
    }
    supabase.table(CUSTOMER_DEVICES_TABLE).insert(data).execute()
    return new_id


def create_repair_request(data: dict):
    response = supabase.table(REPAIR_REQUESTS_TABLE).insert(data).execute()
    return response.data[0] if response and response.data else None


def get_repair_request_by_id(request_id: str):
    response = supabase.table(REPAIR_REQUESTS_TABLE).select("*").eq("id", request_id).maybe_single().execute()
    return response.data if response and hasattr(response, "data") else None


def get_repair_requests(*, customer_id: str | None, technician_id: str | None, request_status: str | None, page: int, limit: int):
    query = supabase.table(REPAIR_REQUESTS_TABLE).select("*", count="exact")
    if customer_id:
        query = query.eq("customer_id", customer_id)
    if technician_id:
        query = query.eq("technician_id", technician_id)
    if request_status:
        query = query.eq("status", request_status)
    response = query.order("created_at", desc=True).range((page - 1) * limit, page * limit - 1).execute()
    return response.data or [], response.count or 0


def update_repair_request(request_id: str, data: dict):
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
        response = supabase.table(REPAIR_REQUESTS_TABLE).update(clean_data).eq("id", request_id).execute()
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
    try:
        response = (
            supabase.table(STATUS_HISTORY_TABLE)
            .select("*")
            .eq("repair_id", repair_id)
            .order("created_at", desc=False)
            .execute()
        )
        return response.data if response and hasattr(response, "data") else []
    except Exception:
        return []


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
    response = (
        supabase.table("repair_quote_items")
        .select("*")
        .eq("quote_id", quote_id)
        .execute()
    )
    return response.data if response and hasattr(response, "data") else []
