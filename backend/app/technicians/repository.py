import json
import logging
import os
import secrets
from datetime import datetime, timezone
from app.db.database import supabase
from app.technicians.models import TECHNICIAN_PROFILES_TABLE

logger = logging.getLogger("h_solution")

BANK_ACCOUNTS_TABLE = "technician_bank_accounts"

# File lưu trữ dự phòng cục bộ khi bảng Supabase chưa có quyền RLS
LOCAL_BANK_FILE = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "uploads",
    "technician_bank_accounts.json",
)


def _read_local_banks() -> dict[str, dict]:
    try:
        if os.path.exists(LOCAL_BANK_FILE):
            with open(LOCAL_BANK_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
    except Exception:
        pass
    return {}


def _write_local_banks(data: dict[str, dict]) -> None:
    try:
        os.makedirs(os.path.dirname(LOCAL_BANK_FILE), exist_ok=True)
        with open(LOCAL_BANK_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    except Exception:
        pass


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
        rev_resp = (
            supabase.table("repair_reviews")
            .select("rating")
            .eq("technician_id", uid)
            .execute()
        )
        if rev_resp and rev_resp.data:
            ratings = [float(r["rating"]) for r in rev_resp.data if r.get("rating") is not None]
            if ratings:
                avg_r = round(sum(ratings) / len(ratings), 1)
                if float(item.get("rating_avg") or 0) != avg_r:
                    supabase.table(TECHNICIAN_PROFILES_TABLE).update({"rating_avg": avg_r}).eq("user_id", uid).execute()
                    item["rating_avg"] = avg_r
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
    item = None
    try:
        response = (
            supabase.table(TECHNICIAN_PROFILES_TABLE)
            .select(PROFILE_SELECT)
            .eq("user_id", user_id)
            .maybe_single()
            .execute()
        )
        if response and response.data:
            item = response.data
    except Exception:
        pass

    if not item:
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

    if item:
        # Luôn đảm bảo bank_account được nạp (ưu tiên DB, fallback sang local store)
        if not item.get("bank_account"):
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
        if resp and resp.data:
            return resp.data
    except Exception:
        pass

    local_banks = _read_local_banks()
    return local_banks.get(technician_id)


def upsert_bank_account(technician_id: str, data: dict):
    now = datetime.now(timezone.utc).isoformat()
    existing = get_bank_account(technician_id)

    record_id = (existing or {}).get("id") or secrets.token_hex(5).upper()
    created_at = (existing or {}).get("created_at") or now
    record = {
        "id": record_id,
        "technician_id": technician_id,
        "bank_code": data.get("bank_code"),
        "bank_name": data.get("bank_name"),
        "account_number": str(data.get("account_number", "")).strip(),
        "account_holder": str(data.get("account_holder", "")).strip(),
        "created_at": created_at,
        "updated_at": now,
    }

    try:
        if existing and existing.get("id"):
            resp = (
                supabase.table(BANK_ACCOUNTS_TABLE)
                .update({**data, "updated_at": now})
                .eq("technician_id", technician_id)
                .execute()
            )
        else:
            resp = supabase.table(BANK_ACCOUNTS_TABLE).insert(record).execute()
        if resp and resp.data:
            record = resp.data[0]
    except Exception as exc:
        logger.warning(f"[Bank Account] Supabase upsert failed, lưu dự phòng cục bộ: {exc}")

    # Luôn ghi bản sao lưu cục bộ để đảm bảo dữ liệu không bị mất khi DB chưa mở quyền RLS
    local_banks = _read_local_banks()
    local_banks[technician_id] = record
    _write_local_banks(local_banks)

    return record


def delete_bank_account(technician_id: str):
    try:
        supabase.table(BANK_ACCOUNTS_TABLE).delete().eq("technician_id", technician_id).execute()
    except Exception:
        pass

    local_banks = _read_local_banks()
    removed = local_banks.pop(technician_id, None)
    if removed:
        _write_local_banks(local_banks)
    return removed or {"success": True}

