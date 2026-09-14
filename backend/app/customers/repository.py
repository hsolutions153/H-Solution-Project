from app.customers.models import ROLES_TABLE, USERS_TABLE
from app.db.database import supabase

CUSTOMER_COLUMNS = "id,full_name,phone,email,address,is_active,created_at,updated_at"


def get_role_by_code(code: str):
    response = supabase.table(ROLES_TABLE).select("id,code").eq("code", code).maybe_single().execute()
    return response.data if response and hasattr(response, "data") else None


def get_customer_by_id(customer_id: str, role_id: str):
    response = (
        supabase.table(USERS_TABLE)
        .select(CUSTOMER_COLUMNS)
        .eq("id", customer_id)
        .eq("role_id", role_id)
        .maybe_single()
        .execute()
    )
    return response.data if response and hasattr(response, "data") else None


def get_user_by_email(email: str):
    response = supabase.table(USERS_TABLE).select("id").eq("email", email).maybe_single().execute()
    return response.data if response and hasattr(response, "data") else None


def get_user_by_phone(phone: str):
    response = supabase.table(USERS_TABLE).select("id").eq("phone", phone).maybe_single().execute()
    return response.data if response and hasattr(response, "data") else None


def get_customers(role_id: str, *, search: str | None, page: int, limit: int):
    query = supabase.table(USERS_TABLE).select(CUSTOMER_COLUMNS, count="exact").eq("role_id", role_id)
    if search:
        keyword = search.replace(",", " ")
        query = query.or_(f"full_name.ilike.%{keyword}%,email.ilike.%{keyword}%,phone.ilike.%{keyword}%")
    response = query.order("created_at", desc=True).range((page - 1) * limit, page * limit - 1).execute()
    return response.data or [], response.count or 0


def create_customer(data: dict):
    response = supabase.table(USERS_TABLE).insert(data).execute()
    return response.data[0] if response and response.data else None


def update_customer(customer_id: str, role_id: str, data: dict):
    response = supabase.table(USERS_TABLE).update(data).eq("id", customer_id).eq("role_id", role_id).execute()
    return response.data[0] if response and response.data else None


def delete_customer(customer_id: str, role_id: str):
    response = supabase.table(USERS_TABLE).delete().eq("id", customer_id).eq("role_id", role_id).execute()
    return response.data[0] if response and response.data else None


def get_device_counts_by_customer_ids(customer_ids: list[str]) -> dict[str, int]:
    if not customer_ids:
        return {}
    try:
        response = (
            supabase.table("customer_devices")
            .select("customer_id")
            .in_("customer_id", customer_ids)
            .execute()
        )
        counts: dict[str, int] = {}
        if response and response.data:
            for d in response.data:
                cid = d.get("customer_id")
                if cid:
                    counts[cid] = counts.get(cid, 0) + 1
        return counts
    except Exception:
        return {}

