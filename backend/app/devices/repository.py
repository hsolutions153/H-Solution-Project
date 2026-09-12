from app.db.database import supabase
from app.devices.models import DEVICES_TABLE


def get_all_devices(customer_id: str | None = None):
    query = supabase.table(DEVICES_TABLE).select("*").order("created_at", desc=True)
    if customer_id:
        query = query.eq("customer_id", customer_id)
    response = query.execute()
    return response.data or []


def get_devices_by_customer_id(customer_id: str):
    response = (
        supabase.table(DEVICES_TABLE)
        .select("*")
        .eq("customer_id", customer_id)
        .order("created_at", desc=True)
        .execute()
    )
    return response.data or []


def get_device_by_id(device_id: str):
    response = supabase.table(DEVICES_TABLE).select("*").eq("id", device_id).maybe_single().execute()
    return response.data if response and hasattr(response, "data") else None


def get_device_by_serial_number(serial_number: str):
    response = (
        supabase.table(DEVICES_TABLE)
        .select("*")
        .eq("serial_number", serial_number)
        .maybe_single()
        .execute()
    )
    return response.data if response and hasattr(response, "data") else None


def insert_device(data: dict):
    response = supabase.table(DEVICES_TABLE).insert(data).execute()
    return response.data[0] if response and response.data else None


def clear_default_device(customer_id: str, exclude_device_id: str | None = None):
    query = supabase.table(DEVICES_TABLE).update({"is_default": False}).eq("customer_id", customer_id).eq("is_default", True)
    if exclude_device_id:
        query = query.neq("id", exclude_device_id)
    query.execute()


def update_device_in_db(device_id: str, data: dict):
    response = supabase.table(DEVICES_TABLE).update(data).eq("id", device_id).execute()
    return response.data[0] if response and response.data else None


def delete_device_from_db(device_id: str):
    response = supabase.table(DEVICES_TABLE).delete().eq("id", device_id).execute()
    return response.data[0] if response and response.data else None
