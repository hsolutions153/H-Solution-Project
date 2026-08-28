from app.db.database import supabase
from app.estimates.models import (
    QUOTE_HISTORY_TABLE,
    QUOTE_ITEMS_TABLE,
    REPAIR_QUOTES_TABLE,
    REPAIR_REQUESTS_TABLE,
    STATUS_HISTORY_TABLE,
)


def get_repair_request_by_id(repair_id: str):
    response = supabase.table(REPAIR_REQUESTS_TABLE).select("*").eq("id", repair_id).maybe_single().execute()
    return response.data if response and hasattr(response, "data") else None


def get_quote_by_id(quote_id: str):
    response = supabase.table(REPAIR_QUOTES_TABLE).select("*").eq("id", quote_id).maybe_single().execute()
    return response.data if response and hasattr(response, "data") else None


def get_quote_by_repair_id(repair_id: str):
    response = (
        supabase.table(REPAIR_QUOTES_TABLE)
        .select("*")
        .eq("repair_id", repair_id)
        .order("created_at", desc=True)
        .limit(1)
        .maybe_single()
        .execute()
    )
    return response.data if response and hasattr(response, "data") else None


def create_quote(data: dict):
    response = supabase.table(REPAIR_QUOTES_TABLE).insert(data).execute()
    return response.data[0] if response and response.data else None


def update_quote(quote_id: str, data: dict):
    response = supabase.table(REPAIR_QUOTES_TABLE).update(data).eq("id", quote_id).execute()
    return response.data[0] if response and response.data else None


def create_quote_item(data: dict):
    response = supabase.table(QUOTE_ITEMS_TABLE).insert(data).execute()
    return response.data[0] if response and response.data else None


def get_quote_items(quote_id: str):
    response = (
        supabase.table(QUOTE_ITEMS_TABLE)
        .select("*")
        .eq("quote_id", quote_id)
        .order("created_at", desc=False)
        .execute()
    )
    return response.data if response and hasattr(response, "data") else []


def add_quote_history(data: dict):
    response = supabase.table(QUOTE_HISTORY_TABLE).insert(data).execute()
    return response.data[0] if response and response.data else None


def update_repair_request(repair_id: str, data: dict):
    response = supabase.table(REPAIR_REQUESTS_TABLE).update(data).eq("id", repair_id).execute()
    return response.data[0] if response and response.data else None


def add_status_history(data: dict):
    response = supabase.table(STATUS_HISTORY_TABLE).insert(data).execute()
    return response.data[0] if response and response.data else None
