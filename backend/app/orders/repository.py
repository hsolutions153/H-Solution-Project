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
    payments_map = {}
    quotes_map = {}
    if repair_ids:
        try:
            pay_resp = (
                supabase.table("payments")
                .select("repair_id,payment_method,payment_status,amount")
                .in_("repair_id", repair_ids)
                .order("created_at", desc=True)
                .execute()
            )
            if pay_resp and pay_resp.data:
                for p in pay_resp.data:
                    rid = p.get("repair_id")
                    if rid and rid not in payments_map:
                        payments_map[rid] = p
        except Exception:
            pass
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
        try:
            q_resp = (
                supabase.table("repair_quotes")
                .select("id,repair_id,status,estimated_price,labor_fee,parts_cost,diagnosis_note,created_at")
                .in_("repair_id", repair_ids)
                .order("created_at", desc=False)
                .execute()
            )
            if q_resp and q_resp.data:
                quote_ids = [q["id"] for q in q_resp.data if q.get("id")]
                quote_items_map = {}
                if quote_ids:
                    try:
                        qi_resp = supabase.table("repair_quote_items").select("*").in_("quote_id", quote_ids).execute()
                        if qi_resp and qi_resp.data:
                            for qi in qi_resp.data:
                                qid = qi.get("quote_id")
                                if qid not in quote_items_map:
                                    quote_items_map[qid] = []
                                qty = float(qi.get("quantity") or 1)
                                price = float(qi.get("unit_price") or qi.get("price") or 0)
                                if qi.get("subtotal") is None:
                                    qi["subtotal"] = qty * price
                                if not qi.get("item_name") and qi.get("name"):
                                    qi["item_name"] = qi["name"]
                                quote_items_map[qid].append(qi)
                    except Exception:
                        pass

                    missing_qids = [qid for qid in quote_ids if qid not in quote_items_map]
                    if missing_qids:
                        try:
                            qi_resp2 = supabase.table("quote_items").select("*").in_("quote_id", missing_qids).execute()
                            if qi_resp2 and qi_resp2.data:
                                for qi in qi_resp2.data:
                                    qid = qi.get("quote_id")
                                    if qid not in quote_items_map:
                                        quote_items_map[qid] = []
                                    qty = float(qi.get("quantity") or 1)
                                    price = float(qi.get("unit_price") or qi.get("price") or 0)
                                    if qi.get("subtotal") is None:
                                        qi["subtotal"] = qty * price
                                    if not qi.get("item_name") and qi.get("name"):
                                        qi["item_name"] = qi["name"]
                                    quote_items_map[qid].append(qi)
                        except Exception:
                            pass

                for q in q_resp.data:
                    rid = q.get("repair_id")
                    if rid not in quotes_map:
                        quotes_map[rid] = []
                    q["items"] = quote_items_map.get(q["id"], [])
                    quotes_map[rid].append(q)
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
        pay_info = payments_map.get(item.get("id"))
        if pay_info:
            item["payment_method"] = pay_info.get("payment_method")
            item["payment_status"] = pay_info.get("payment_status")
        q_list = quotes_map.get(item.get("id"), [])
        if q_list:
            item["quotes"] = q_list
            initial_q = q_list[0]
            item["initial_estimate"] = float(initial_q.get("estimated_price") or 0)
            accepted_q = [q for q in q_list if q.get("status") in {"ACCEPTED", "APPROVED"}]
            if accepted_q:
                item["approved_estimate"] = sum(float(q.get("estimated_price") or 0) for q in accepted_q)
            else:
                item["approved_estimate"] = 0.0

            pending_q = [q for q in q_list if q.get("status") == "PENDING"]
            if pending_q:
                item["pending_quote"] = pending_q[-1]

            # Gán quote đại diện là báo giá ban đầu (chứ không gán đè quote phát sinh)
            item["quote"] = initial_q

            # Nếu có khoản đã duyệt, total_amount phản ánh tổng các khoản đã duyệt
            if accepted_q and item.get("status") not in {"COMPLETED", "CANCELLED"}:
                item["total_amount"] = item.get("approved_estimate")
            elif (item.get("total_amount") is None or float(item.get("total_amount") or 0) == 0):
                item["total_amount"] = item.get("approved_estimate") if accepted_q else item.get("initial_estimate")

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
        .select("user_id,kyc_status,is_online,last_latitude,last_longitude,last_location_at")
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
                "cancelled_at": None,
                "cancel_reason": None,
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
