from app.db.database import supabase
from app.orders.models import ORDERS_TABLE, STATUS_HISTORY_TABLE, TECHNICIAN_PROFILES_TABLE

ORDER_SELECT = (
    "*,customer:users!fk_repair_customer(id,full_name,phone),"
    "technician:technician_profiles!fk_repair_technician(user_id,user:users!fk_technician_user(id,full_name,phone)),"
    "device:customer_devices!fk_repair_device(id,device_type,manufacturer,model_name,serial_number),"
    "images:repair_requests_images!fk_repair_images_repair(id,image_url,image_type,description)"
)


def _enrich_orders(data: list[dict]):
    if not data:
        return data

    repair_ids = [item["id"] for item in data if item.get("id")]
    user_ids = set()
    device_ids = set()
    for item in data:
        # Unwrap nested technician_profile -> user if present from PostgREST FK join
        if isinstance(item.get("technician"), dict) and "user" in item["technician"]:
            user_data = item["technician"].get("user") or {}
            item["technician"] = {
                "id": item["technician"].get("user_id") or user_data.get("id"),
                "full_name": user_data.get("full_name"),
                "phone": user_data.get("phone"),
            }

        if item.get("customer_id") and ("customer" not in item or not item["customer"]):
            user_ids.add(item["customer_id"])
        if item.get("technician_id") and ("technician" not in item or not item["technician"]):
            user_ids.add(item["technician_id"])
        if item.get("device_id") and ("device" not in item or not item["device"]):
            device_ids.add(item["device_id"])

    users_map = {}
    if user_ids:
        try:
            users_resp = supabase.table("users").select("id,full_name,phone").in_("id", list(user_ids)).execute()
            if users_resp and users_resp.data:
                users_map = {u["id"]: u for u in users_resp.data}
        except Exception:
            pass

    devices_map = {}
    if device_ids:
        try:
            dev_resp = (
                supabase.table("customer_devices")
                .select("id,device_type,manufacturer,model_name,serial_number")
                .in_("id", list(device_ids))
                .execute()
            )
            if dev_resp and dev_resp.data:
                devices_map = {d["id"]: d for d in dev_resp.data}
        except Exception:
            pass

    images_map = {}
    if repair_ids:
        try:
            img_resp = (
                supabase.table("repair_requests_images")
                .select("id,repair_id,image_url,image_type,description")
                .in_("repair_id", repair_ids)
                .execute()
            )
            if img_resp and img_resp.data:
                for img in img_resp.data:
                    rid = img.get("repair_id")
                    if rid not in images_map:
                        images_map[rid] = []
                    images_map[rid].append(img)
        except Exception:
            pass

    for item in data:
        if "customer" not in item or not item["customer"]:
            item["customer"] = users_map.get(item.get("customer_id"))
        if "technician" not in item or not item["technician"]:
            item["technician"] = users_map.get(item.get("technician_id"))
        if "device" not in item or not item["device"]:
            item["device"] = devices_map.get(item.get("device_id"))
        if not item.get("images"):
            item["images"] = images_map.get(item["id"], [])

    return data


def get_orders(*, order_status: str | None, page: int, limit: int):
    data = []
    count = 0
    try:
        query = supabase.table(ORDERS_TABLE).select(ORDER_SELECT, count="exact")
        if order_status:
            query = query.eq("status", order_status)
        response = query.order("created_at", desc=True).range((page - 1) * limit, page * limit - 1).execute()
        if response and response.data is not None:
            data = response.data
            count = response.count or len(data)
    except Exception:
        pass

    if not data:
        query = supabase.table(ORDERS_TABLE).select("*", count="exact")
        if order_status:
            query = query.eq("status", order_status)
        response = query.order("created_at", desc=True).range((page - 1) * limit, page * limit - 1).execute()
        data = response.data or []
        count = response.count or len(data)

    _enrich_orders(data)
    return data, count


def get_order_by_id(order_id: str):
    item = None
    try:
        response = supabase.table(ORDERS_TABLE).select(ORDER_SELECT).eq("id", order_id).maybe_single().execute()
        if response and response.data:
            item = response.data
    except Exception:
        pass

    if not item:
        response = supabase.table(ORDERS_TABLE).select("*").eq("id", order_id).maybe_single().execute()
        if response and response.data:
            item = response.data

    if item:
        _enrich_orders([item])
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
