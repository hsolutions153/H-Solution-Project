from app.db.database import supabase
from app.repair_requests.models import (
    CUSTOMER_DEVICES_TABLE,
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
    response = supabase.table(REPAIR_REQUESTS_TABLE).update(data).eq("id", request_id).execute()
    return response.data[0] if response and response.data else None


def has_accepted_quote(request_id: str) -> bool:
    response = (
        supabase.table(REPAIR_QUOTES_TABLE)
        .select("id")
        .eq("repair_id", request_id)
        .eq("status", "ACCEPTED")
        .limit(1)
        .execute()
    )
    return bool(response and response.data)


def add_status_history(data: dict):
    response = supabase.table(STATUS_HISTORY_TABLE).insert(data).execute()
    return response.data[0] if response and response.data else None
