from app.db.database import supabase
from app.technicians.models import TECHNICIAN_PROFILES_TABLE
from app.technicians.ratings import sync_technician_rating

BANK_ACCOUNTS_TABLE = "technician_bank_accounts"

# Câu select join user + tài khoản ngân hàng
PROFILE_SELECT = (
    "*,user:users!fk_technician_user("
    "id,full_name,email,phone,avatar_url,is_active),"
    "bank_account:technician_bank_accounts!fk_bank_technician("
    "id,bank_code,bank_name,account_number,account_holder,created_at,updated_at)"
)


def _sync_technician_stats(item: dict) -> dict:
    # Đồng bộ số ca hoàn thành và đánh giá trung bình từ DB thực tế
    if not item or not item.get("user_id"):
        return item
    uid = item["user_id"]
    try:
        c_resp = (
            supabase.table("repair_requests")
            .select("id", count="exact")
            .eq("technician_id", uid)
            .eq("status", "COMPLETED")
            .execute()
        )
        if c_resp and c_resp.count is not None:
            actual_done = c_resp.count
            if item.get("total_jobs_done") != actual_done:
                supabase.table(TECHNICIAN_PROFILES_TABLE).update({"total_jobs_done": actual_done}).eq("user_id", uid).execute()
                item["total_jobs_done"] = actual_done
    except Exception:
        pass

    try:
        average = sync_technician_rating(uid, item.get("rating_avg"))
        if average is not None:
            item["rating_avg"] = average
    except Exception:
        pass

    return item


def get_all_technicians(kyc_status: str | None = None):
    data = []
    try:
        query = supabase.table(TECHNICIAN_PROFILES_TABLE).select(PROFILE_SELECT).order("created_at", desc=True)
        if kyc_status:
            query = query.eq("kyc_status", kyc_status)
        response = query.execute()
        if response and response.data is not None:
            data = response.data
    except Exception:
        pass

    # Fallback: select thường rồi join user thủ công nếu select có join thất bại
    if not data:
        query = supabase.table(TECHNICIAN_PROFILES_TABLE).select("*").order("created_at", desc=True)
        if kyc_status:
            query = query.eq("kyc_status", kyc_status)
        response = query.execute()
        data = response.data or []

        user_ids = [item["user_id"] for item in data if item.get("user_id")]
        users_map = {}
        if user_ids:
            users_resp = supabase.table("users").select("id,full_name,email,phone,avatar_url,is_active").in_("id", user_ids).execute()
            if users_resp and users_resp.data:
                users_map = {u["id"]: u for u in users_resp.data}

        for item in data:
            if "user" not in item or not item["user"]:
                item["user"] = users_map.get(item.get("user_id"))

    # Cập nhật số ca hoàn thành thực tế cho toàn danh sách
    try:
        req_resp = (
            supabase.table("repair_requests")
            .select("technician_id")
            .eq("status", "COMPLETED")
            .execute()
        )
        if req_resp and req_resp.data:
            counts_map: dict[str, int] = {}
            for r in req_resp.data:
                tid = r.get("technician_id")
                if tid:
                    counts_map[tid] = counts_map.get(tid, 0) + 1
            for item in data:
                uid = item.get("user_id")
                if uid and uid in counts_map:
                    item["total_jobs_done"] = counts_map[uid]
    except Exception:
        pass

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
            return _sync_technician_stats(response.data)
    except Exception:
        pass

    # Fallback nếu select join thất bại
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
            user_resp = supabase.table("users").select("id,full_name,email,phone,avatar_url,is_active").eq("id", item["user_id"]).maybe_single().execute()
            if user_resp and user_resp.data:
                item["user"] = user_resp.data
        bank_resp = get_bank_account(user_id)
        if bank_resp:
            item["bank_account"] = bank_resp
        return _sync_technician_stats(item)

    # Tự động tạo hồ sơ KTV nếu user đã có trong bảng users
    try:
        user_resp = (
            supabase.table("users")
            .select("id,full_name,email,phone,avatar_url,is_active")
            .eq("id", user_id)
            .maybe_single()
            .execute()
        )
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
                "is_online": False,
                "rating_avg": 5.0,
                "total_jobs_done": 0,
                "created_by": "SYSTEM",
                "updated_by": "SYSTEM",
            }
            ins_resp = supabase.table(TECHNICIAN_PROFILES_TABLE).insert(new_profile).execute()
            if ins_resp and ins_resp.data:
                created = ins_resp.data[0]
                created["user"] = user_info
                return _sync_technician_stats(created)
    except Exception:
        pass

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


def get_bank_account(technician_id: str):
    try:
        resp = (
            supabase.table(BANK_ACCOUNTS_TABLE)
            .select("*")
            .eq("technician_id", technician_id)
            .maybe_single()
            .execute()
        )
        return resp.data if resp and resp.data else None
    except Exception:
        return None


def upsert_bank_account(technician_id: str, data: dict):
    import secrets
    from datetime import datetime, timezone

    now = datetime.now(timezone.utc).isoformat()
    existing = get_bank_account(technician_id)

    if existing:
        resp = (
            supabase.table(BANK_ACCOUNTS_TABLE)
            .update({**data, "updated_at": now})
            .eq("technician_id", technician_id)
            .execute()
        )
    else:
        resp = supabase.table(BANK_ACCOUNTS_TABLE).insert({
            "id": secrets.token_hex(5).upper(),
            "technician_id": technician_id,
            "created_at": now,
            "updated_at": now,
            **data,
        }).execute()

    return resp.data[0] if resp and resp.data else None


def delete_bank_account(technician_id: str):
    resp = (
        supabase.table(BANK_ACCOUNTS_TABLE)
        .delete()
        .eq("technician_id", technician_id)
        .execute()
    )
    return resp.data[0] if resp and resp.data else None
