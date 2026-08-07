from app.db.database import supabase
from app.technicians.models import TECHNICIAN_PROFILES_TABLE

PROFILE_SELECT = (
    "*,user:users!technician_profiles_user_id_fkey("
    "id,full_name,email,phone,is_active)"
)


def get_all_technicians(kyc_status: str | None = None):
    query = supabase.table(TECHNICIAN_PROFILES_TABLE).select(PROFILE_SELECT).order("created_at", desc=True)
    if kyc_status:
        query = query.eq("kyc_status", kyc_status)
    return query.execute().data


def get_technician_by_user_id(user_id: str):
    response = (
        supabase.table(TECHNICIAN_PROFILES_TABLE)
        .select(PROFILE_SELECT)
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )
    return response.data


def get_technician_by_id_card_number(id_card_number: str):
    response = (
        supabase.table(TECHNICIAN_PROFILES_TABLE)
        .select("user_id")
        .eq("id_card_number", id_card_number)
        .maybe_single()
        .execute()
    )
    return response.data


def insert_technician(data: dict):
    response = supabase.table(TECHNICIAN_PROFILES_TABLE).insert(data).execute()
    return response.data[0] if response.data else None


def update_technician_in_db(user_id: str, data: dict):
    response = supabase.table(TECHNICIAN_PROFILES_TABLE).update(data).eq("user_id", user_id).execute()
    return response.data[0] if response.data else None


def delete_technician_from_db(user_id: str):
    response = supabase.table(TECHNICIAN_PROFILES_TABLE).delete().eq("user_id", user_id).execute()
    return response.data[0] if response.data else None
