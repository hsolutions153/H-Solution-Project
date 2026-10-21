from app.db.database import supabase

USERS_TABLE = "users"
ROLES_TABLE = "roles"
USER_SELECT = "*,role:roles(id,code,name)"


def get_user_by_email(email: str):
    response = supabase.table(USERS_TABLE).select(USER_SELECT).eq("email", email).maybe_single().execute()
    return response.data if response and hasattr(response, "data") else None

def get_user_by_id(user_id: str):
    response = supabase.table(USERS_TABLE).select(USER_SELECT).eq("id", user_id).maybe_single().execute()
    return response.data if response and hasattr(response, "data") else None


def get_user_by_phone(phone: str):
    response = supabase.table(USERS_TABLE).select("id").eq("phone", phone).maybe_single().execute()
    return response.data if response and hasattr(response, "data") else None


def update_user_password(user_id: str, password_hash: str):
    response = supabase.table(USERS_TABLE).update({"password_hash": password_hash}).eq("id", user_id).execute()
    return response.data[0] if response and response.data else None


_ROLE_CACHE: dict[str, dict] = {}


def get_role_by_code(code: str):
    if code in _ROLE_CACHE:
        return _ROLE_CACHE[code]
    response = supabase.table(ROLES_TABLE).select("id,code,name").eq("code", code).maybe_single().execute()
    data = response.data if response and hasattr(response, "data") else None
    if data:
        _ROLE_CACHE[code] = data
    return data


def create_user(data: dict):
    response = supabase.table(USERS_TABLE).insert(data).execute()
    if response and hasattr(response, "data") and response.data:
        return response.data[0]
    return None


def get_latest_otp(phone: str):
    response = (
        supabase.table("otps")
        .select("id,created_at")
        .eq("phone", phone)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    return response.data[0] if response and response.data else None


def invalidate_unused_otps(phone: str, used_at: str):
    return (
        supabase.table("otps")
        .update({"is_used": True, "used_at": used_at})
        .eq("phone", phone)
        .eq("is_used", False)
        .execute()
    )


def create_otp(data: dict):
    response = supabase.table("otps").insert(data).execute()
    return response.data[0] if response and response.data else None


def get_valid_otp(phone: str, now: str):
    response = (
        supabase.table("otps")
        .select("id,otp_code")
        .eq("phone", phone)
        .eq("is_used", False)
        .gt("expires_at", now)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    return response.data[0] if response and response.data else None


def mark_otp_used(otp_id: str, used_at: str):
    response = supabase.table("otps").update({"is_used": True, "used_at": used_at}).eq("id", otp_id).execute()
    return response.data[0] if response and response.data else None


REFRESH_TOKENS_TABLE = "refresh_tokens"


def create_refresh_token(data: dict):
    response = supabase.table(REFRESH_TOKENS_TABLE).insert(data).execute()
    return response.data[0] if response and response.data else None


def get_refresh_token_by_hash(token_hash: str):
    response = (
        supabase.table(REFRESH_TOKENS_TABLE)
        .select("*")
        .eq("token_hash", token_hash)
        .limit(1)
        .execute()
    )
    return response.data[0] if response and response.data else None


def revoke_refresh_token(token_id: str, revoked_at: str):
    return (
        supabase.table(REFRESH_TOKENS_TABLE)
        .update({"revoked_at": revoked_at, "updated_at": revoked_at})
        .eq("id", token_id)
        .is_("revoked_at", "null")
        .execute()
    )


def revoke_all_user_refresh_tokens(user_id: str, revoked_at: str):
    return (
        supabase.table(REFRESH_TOKENS_TABLE)
        .update({"revoked_at": revoked_at, "updated_at": revoked_at})
        .eq("user_id", user_id)
        .is_("revoked_at", "null")
        .execute()
    )
