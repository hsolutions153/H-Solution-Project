from app.db.database import supabase
from app.repair_history.models import (
    CUSTOMER_DEVICES_TABLE,
    QUOTE_ITEMS_TABLE,
    REPAIR_IMAGES_TABLE,
    REPAIR_QUOTES_TABLE,
    REPAIR_REQUESTS_TABLE,
    REVIEWS_TABLE,
    USERS_TABLE,
)


def get_device_by_id(device_id: str):
    response = supabase.table(CUSTOMER_DEVICES_TABLE).select("*").eq("id", device_id).maybe_single().execute()
    return response.data if response and hasattr(response, "data") else None


def get_repairs_by_device_id(device_id: str):
    response = (
        supabase.table(REPAIR_REQUESTS_TABLE)
        .select("*")
        .eq("device_id", device_id)
        .order("created_at", desc=True)
        .execute()
    )
    return response.data if response and hasattr(response, "data") else []


def get_repairs_history(*, customer_id: str | None, device_id: str | None, page: int, limit: int):
    query = supabase.table(REPAIR_REQUESTS_TABLE).select("*", count="exact")
    if customer_id:
        query = query.eq("customer_id", customer_id)
    if device_id:
        query = query.eq("device_id", device_id)
    response = query.order("created_at", desc=True).range((page - 1) * limit, page * limit - 1).execute()
    return response.data or [], response.count or 0


def get_images_by_repair_ids(repair_ids: list[str]):
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


def get_accepted_quotes_by_repair_ids(repair_ids: list[str]):
    if not repair_ids:
        return []
    response = (
        supabase.table(REPAIR_QUOTES_TABLE)
        .select("*")
        .in_("repair_id", repair_ids)
        .eq("status", "ACCEPTED")
        .execute()
    )
    return response.data if response and hasattr(response, "data") else []


def get_quote_items_by_quote_ids(quote_ids: list[str]):
    if not quote_ids:
        return []
    response = (
        supabase.table(QUOTE_ITEMS_TABLE)
        .select("*")
        .in_("quote_id", quote_ids)
        .execute()
    )
    return response.data if response and hasattr(response, "data") else []


def get_technicians_by_ids(user_ids: list[str]):
    if not user_ids:
        return []
    response = (
        supabase.table(USERS_TABLE)
        .select("id, full_name, phone")
        .in_("id", user_ids)
        .execute()
    )
    return response.data if response and hasattr(response, "data") else []


def get_reviews_by_repair_ids(repair_ids: list[str]):
    if not repair_ids:
        return []
    response = (
        supabase.table(REVIEWS_TABLE)
        .select("*")
        .in_("repair_id", repair_ids)
        .execute()
    )
    return response.data if response and hasattr(response, "data") else []
