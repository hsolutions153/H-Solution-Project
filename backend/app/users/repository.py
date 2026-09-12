from app.auth.repository import ROLES_TABLE, USERS_TABLE
from app.db.database import supabase

USER_SELECT = (
    "id,role_id,full_name,phone,email,address,is_active,is_online,"
    "locked_reason,created_at,updated_at,role:roles(id,code,name,description)"
)


def get_roles():
    response = supabase.table(ROLES_TABLE).select("id,code,name,description").order("name").execute()
    return response.data if response and hasattr(response, "data") else []


def get_role_by_id(role_id: str):
    response = supabase.table(ROLES_TABLE).select("id,code,name,description").eq("id", role_id).maybe_single().execute()
    return response.data if response and hasattr(response, "data") else None


def get_role_by_code(code: str):
    response = supabase.table(ROLES_TABLE).select("id,code,name,description").eq("code", code).maybe_single().execute()
    return response.data if response and hasattr(response, "data") else None


def get_user_by_id(user_id: str):
    response = supabase.table(USERS_TABLE).select(USER_SELECT).eq("id", user_id).maybe_single().execute()
    return response.data if response and hasattr(response, "data") else None


def get_user_by_email(email: str):
    response = supabase.table(USERS_TABLE).select("id").eq("email", email).maybe_single().execute()
    return response.data if response and hasattr(response, "data") else None


def get_user_by_phone(phone: str):
    response = supabase.table(USERS_TABLE).select("id").eq("phone", phone).maybe_single().execute()
    return response.data if response and hasattr(response, "data") else None


def get_users(
    *,
    search: str | None,
    role_id: str | None,
    is_active: bool | None,
    page: int,
    limit: int,
):
    query = supabase.table(USERS_TABLE).select(USER_SELECT, count="exact")
    if role_id:
        query = query.eq("role_id", role_id)
    if is_active is not None:
        query = query.eq("is_active", is_active)
    if search:
        keyword = search.replace(",", " ")
        query = query.or_(f"full_name.ilike.%{keyword}%,email.ilike.%{keyword}%,phone.ilike.%{keyword}%,id.ilike.%{keyword}%")

    response = query.order("created_at", desc=True).range((page - 1) * limit, page * limit - 1).execute()
    return response.data or [], response.count or 0


def create_user(data: dict):
    response = supabase.table(USERS_TABLE).insert(data).execute()
    return response.data[0] if response and response.data else None


def update_user(user_id: str, data: dict):
    response = supabase.table(USERS_TABLE).update(data).eq("id", user_id).execute()
    return response.data[0] if response and response.data else None


def delete_user(user_id: str):
    response = supabase.table(USERS_TABLE).delete().eq("id", user_id).execute()
    return response.data[0] if response and response.data else None
