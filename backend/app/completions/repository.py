from app.db.database import supabase
from app.completions.models import (
    REPAIR_IMAGES_TABLE,
    REPAIR_REQUESTS_TABLE,
    STATUS_HISTORY_TABLE,
)


def get_repair_request_by_id(repair_id: str):
    response = supabase.table(REPAIR_REQUESTS_TABLE).select("*").eq("id", repair_id).maybe_single().execute()
    return response.data if response and hasattr(response, "data") else None


def update_repair_request(repair_id: str, data: dict):
    response = supabase.table(REPAIR_REQUESTS_TABLE).update(data).eq("id", repair_id).execute()
    return response.data[0] if response and response.data else None


def create_repair_image(data: dict):
    response = supabase.table(REPAIR_IMAGES_TABLE).insert(data).execute()
    return response.data[0] if response and response.data else None


def add_status_history(data: dict):
    response = supabase.table(STATUS_HISTORY_TABLE).insert(data).execute()
    return response.data[0] if response and response.data else None
