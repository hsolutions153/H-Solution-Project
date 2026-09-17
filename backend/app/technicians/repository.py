from app.db.database import supabase
from app.technicians.models import TECHNICIAN_PROFILES_TABLE

PROFILE_SELECT = (
    "*,user:users!fk_technician_user("
    "id,full_name,email,phone,is_active)"
)


def get_all_technicians(kyc_status: str | None = None):
    try:
        query = supabase.table(TECHNICIAN_PROFILES_TABLE).select(PROFILE_SELECT).order("created_at", desc=True)
        if kyc_status:
            query = query.eq("kyc_status", kyc_status)
        response = query.execute()
        if response and response.data is not None:
            return response.data
    except Exception:
        pass

    query = supabase.table(TECHNICIAN_PROFILES_TABLE).select("*").order("created_at", desc=True)
    if kyc_status:
        query = query.eq("kyc_status", kyc_status)
    response = query.execute()
    data = response.data or []

    user_ids = [item["user_id"] for item in data if item.get("user_id")]
    users_map = {}
    if user_ids:
        users_resp = supabase.table("users").select("id,full_name,email,phone,is_active").in_("id", user_ids).execute()
        if users_resp and users_resp.data:
            users_map = {u["id"]: u for u in users_resp.data}

    for item in data:
        if "user" not in item or not item["user"]:
            item["user"] = users_map.get(item.get("user_id"))

    return data


def get_technician_by_user_id(user_id: str):
    try:
        response = (
            supabase.table(TECHNICIAN_PROFILES_TABLE)
            .select(PROFILE_SELECT)
            .eq("user_id", user_id)
            .maybe_single()
            .execute()
        )
        if response and response.data:
            return response.data
    except Exception:
        pass

    response = (
        supabase.table(TECHNICIAN_PROFILES_TABLE)
        .select("*")
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )
    if response and response.data:
        item = response.data
        if item.get("user_id"):
            user_resp = supabase.table("users").select("id,full_name,email,phone,is_active").eq("id", item["user_id"]).maybe_single().execute()
            if user_resp and user_resp.data:
                item["user"] = user_resp.data
        return item

    # Auto-create technician profile if user exists in users table
    try:
        user_resp = supabase.table("users").select("id,full_name,email,phone,is_active").eq("id", user_id).maybe_single().execute()
        if user_resp and user_resp.data:
            user_info = user_resp.data
            clean_id = str(user_id).replace("-", "")[:8]
            new_profile = {
                "user_id": user_id,
                "id_card_number": f"ID-{clean_id}",
                "id_card_front": "https://example.com/front.jpg",
                "id_card_back": "https://example.com/back.jpg",
                "certificate_img": "https://example.com/cert.jpg",
                "skills": "BOTH",
                "specialization": "Kỹ thuật viên Sửa chữa H-Solution",
                "experience_years": 3,
                "kyc_status": "APPROVED",
                "is_online": True,
                "rating_avg": 5.0,
                "total_jobs_done": 0,
                "created_by": "SYSTEM",
                "updated_by": "SYSTEM",
            }
            ins_resp = supabase.table(TECHNICIAN_PROFILES_TABLE).insert(new_profile).execute()
            if ins_resp and ins_resp.data:
                created = ins_resp.data[0]
                created["user"] = user_info
                return created
    except Exception as err:
        print("Auto-creation of technician profile failed:", err)

    return None

def get_technician_by_id_card_number(id_card_number: str):
    response = (
        supabase.table(TECHNICIAN_PROFILES_TABLE)
        .select("user_id")
        .eq("id_card_number", id_card_number)
        .maybe_single()
        .execute()
    )
    return response.data if response and hasattr(response, "data") else None


def insert_technician(data: dict):
    response = supabase.table(TECHNICIAN_PROFILES_TABLE).insert(data).execute()
    return response.data[0] if response and response.data else None


def update_technician_in_db(user_id: str, data: dict):
    response = supabase.table(TECHNICIAN_PROFILES_TABLE).update(data).eq("user_id", user_id).execute()
    return response.data[0] if response and response.data else None


def delete_technician_from_db(user_id: str):
    response = supabase.table(TECHNICIAN_PROFILES_TABLE).delete().eq("user_id", user_id).execute()
    return response.data[0] if response and response.data else None
