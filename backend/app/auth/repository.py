from app.db.database import supabase

USERS_TABLE = "users"
ROLES_TABLE = "roles"
USER_SELECT = "*,role:roles!users_role_id_fkey(id,code,name)"


def get_user_by_email(email: str):
    response = supabase.table(USERS_TABLE).select(USER_SELECT).eq("email", email).maybe_single().execute()
    return response.data if response and hasattr(response, "data") else None

def get_user_by_id(user_id: str):
    response = supabase.table(USERS_TABLE).select(USER_SELECT).eq("id", user_id).maybe_single().execute()
    return response.data if response and hasattr(response, "data") else None


def get_user_by_phone(phone: str):
    response = supabase.table(USERS_TABLE).select("id").eq("phone", phone).maybe_single().execute()
    return response.data if response and hasattr(response, "data") else None


def get_role_by_code(code: str):
    response = supabase.table(ROLES_TABLE).select("id,code,name").eq("code", code).maybe_single().execute()
    return response.data if response and hasattr(response, "data") else None


def create_user(data: dict):
    response = supabase.table(USERS_TABLE).insert(data).execute()
    if response and hasattr(response, "data") and response.data:
        return response.data[0]
    return None