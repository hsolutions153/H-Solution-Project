from app.db.database import supabase
from app.orders.models import ORDERS_TABLE, STATUS_HISTORY_TABLE, TECHNICIAN_PROFILES_TABLE

ORDER_SELECT = (
    "*,customer:users!repair_requests_customer_id_fkey(id,full_name,phone),"
    "technician:users!repair_requests_technician_id_fkey(id,full_name,phone)"
)


def get_orders(*, order_status: str | None, page: int, limit: int):
    query = supabase.table(ORDERS_TABLE).select(ORDER_SELECT, count="exact")
    if order_status:
        query = query.eq("status", order_status)
    response = query.order("created_at", desc=True).range((page - 1) * limit, page * limit - 1).execute()
    return (response.data or []), (response.count or 0)


def get_order_by_id(order_id: str):
    response = supabase.table(ORDERS_TABLE).select(ORDER_SELECT).eq("id", order_id).maybe_single().execute()
    return response.data if response and hasattr(response, "data") else None


def get_technician_profile(user_id: str):
    response = (
        supabase.table(TECHNICIAN_PROFILES_TABLE)
        .select("user_id,kyc_status,is_online")
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )
    return response.data if response and hasattr(response, "data") else None


def assign_order(order_id: str, technician_id: str, assigned_at: str):
    response = (
        supabase.table(ORDERS_TABLE)
        .update({"technician_id": technician_id, "status": "ASSIGNED", "assigned_at": assigned_at})
        .eq("id", order_id)
        .execute()
    )
    return response.data[0] if response and response.data else None


def add_status_history(data: dict):
    response = supabase.table(STATUS_HISTORY_TABLE).insert(data).execute()
    return response.data[0] if response and response.data else None


def get_order_statuses():
    response = supabase.table(ORDERS_TABLE).select("status").execute()
    return response.data or []
