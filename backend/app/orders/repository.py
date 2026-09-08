from app.db.database import supabase
from app.orders.models import ORDERS_TABLE, STATUS_HISTORY_TABLE, TECHNICIAN_PROFILES_TABLE

ORDER_SELECT = (
    "*,customer:users!repair_requests_customer_id_fkey(id,full_name,phone),"
    "technician:users!repair_requests_technician_id_fkey(id,full_name,phone)"
)


def get_orders(*, order_status: str | None, page: int, limit: int):
    try:
        query = supabase.table(ORDERS_TABLE).select(ORDER_SELECT, count="exact")
        if order_status:
            query = query.eq("status", order_status)
        response = query.order("created_at", desc=True).range((page - 1) * limit, page * limit - 1).execute()
        if response and response.data is not None:
            return response.data, response.count or 0
    except Exception as e:
        print("ORDER_SELECT FK join failed, falling back to manual join:", e)

    query = supabase.table(ORDERS_TABLE).select("*", count="exact")
    if order_status:
        query = query.eq("status", order_status)
    response = query.order("created_at", desc=True).range((page - 1) * limit, page * limit - 1).execute()
    data = response.data or []
    count = response.count or len(data)

    user_ids = set()
    for item in data:
        if item.get("customer_id"):
            user_ids.add(item["customer_id"])
        if item.get("technician_id"):
            user_ids.add(item["technician_id"])

    users_map = {}
    if user_ids:
        users_resp = supabase.table("users").select("id,full_name,phone").in_("id", list(user_ids)).execute()
        if users_resp and users_resp.data:
            users_map = {u["id"]: u for u in users_resp.data}

    for item in data:
        if "customer" not in item or not item["customer"]:
            item["customer"] = users_map.get(item.get("customer_id"))
        if "technician" not in item or not item["technician"]:
            item["technician"] = users_map.get(item.get("technician_id"))

    return data, count


def get_order_by_id(order_id: str):
    try:
        response = supabase.table(ORDERS_TABLE).select(ORDER_SELECT).eq("id", order_id).maybe_single().execute()
        if response and response.data:
            return response.data
    except Exception:
        pass

    response = supabase.table(ORDERS_TABLE).select("*").eq("id", order_id).maybe_single().execute()
    if not response or not response.data:
        return None
    item = response.data
    user_ids = [u for u in [item.get("customer_id"), item.get("technician_id")] if u]
    if user_ids:
        users_resp = supabase.table("users").select("id,full_name,phone").in_("id", user_ids).execute()
        if users_resp and users_resp.data:
            users_map = {u["id"]: u for u in users_resp.data}
            item["customer"] = users_map.get(item.get("customer_id"))
            item["technician"] = users_map.get(item.get("technician_id"))
    return item


def get_technician_profile(user_id: str):
    response = (
        supabase.table(TECHNICIAN_PROFILES_TABLE)
        .select("user_id,kyc_status,is_online")
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )
    return response.data if response and hasattr(response, "data") else None


def assign_order(order_id: str, technician_id: str, assigned_at: str, assigned_by: str):
    response = (
        supabase.table(ORDERS_TABLE)
        .update(
            {
                "technician_id": technician_id,
                "status": "ASSIGNED",
                "assigned_at": assigned_at,
                "updated_by": assigned_by,
            }
        )
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
