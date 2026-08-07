from app.db.database import supabase
from app.devices.models import DEVICES_TABLE


def get_all_devices(customer_id: str | None = None):
    query = supabase.table(DEVICES_TABLE).select("*").order("created_at", desc=True)
    if customer_id:
        query = query.eq("customer_id", customer_id)
    return query.execute().data


def get_device_by_id(device_id: str):
    response = supabase.table(DEVICES_TABLE).select("*").eq("id", device_id).maybe_single().execute()
    return response.data


def get_device_by_serial_number(serial_number: str):
    response = (
        supabase.table(DEVICES_TABLE)
        .select("*")
        .eq("serial_number", serial_number)
        .maybe_single()
        .execute()
    )
    return response.data


def insert_device(data: dict):
    response = supabase.table(DEVICES_TABLE).insert(data).execute()
    return response.data[0]


def update_device_in_db(device_id: str, data: dict):
    response = supabase.table(DEVICES_TABLE).update(data).eq("id", device_id).execute()
    return response.data[0] if response.data else None


def delete_device_from_db(device_id: str):
    response = supabase.table(DEVICES_TABLE).delete().eq("id", device_id).execute()
    return response.data[0] if response.data else None
