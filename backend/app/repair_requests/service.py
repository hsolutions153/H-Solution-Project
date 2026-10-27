import secrets
import uuid
import logging
import math
import os
import re
from collections import defaultdict
from datetime import datetime, time, timedelta, timezone

import requests
from postgrest import APIError

logger = logging.getLogger(__name__)

VN_TZ = timezone(timedelta(hours=7))

from fastapi import UploadFile

from app.auth import repository as auth_repository
from app.core import storage
from app.core.exceptions import AppException, ErrorCode
from app.customers.models import ADMIN_ROLE_CODE, CUSTOMER_ROLE_CODE
from app.repair_requests import repository
from app.repair_requests.models import (
    IMAGE_TYPES,
    ITEM_TYPES,
    ISSUE_TYPES,
    REPAIR_REQUESTS_TABLE,
    REQUEST_STATUSES,
    TECHNICIAN_ROLE_CODE,
    TECHNICIAN_TRANSITIONS,
)

MAX_IMAGE_SIZE_MB = 50
MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024
VALID_IMAGE_EXTENSIONS = {"jpg", "jpeg", "png", "webp"}
DUPLICATE_REQUEST_WINDOW_SECONDS = 60
# Trạng thái KTV đã nhận đơn và chưa hoàn tất / hủy.
TECHNICIAN_IN_PROGRESS_STATUSES = {
    # Đơn đã giao cho KTV cũng phải giữ chỗ nếu là đơn không có lịch hẹn;
    # nếu không Admin có thể dồn nhiều đơn chưa nhận vào cùng một KTV.
    "ASSIGNED",
    "ACCEPTED",
    "EN_ROUTE",
    "ARRIVED",
    "DIAGNOSING",
    "ESTIMATE_SUBMITTED",
    "WAITING_FOR_APPROVAL",
    "ESTIMATE_APPROVED",
    "ESTIMATE_REJECTED",
    "REPAIRING",
}



def _payload(data):
    if isinstance(data, dict):
        return data
    if hasattr(data, "model_dump"):
        return data.model_dump(mode="json")
    if hasattr(data, "dict"):
        return data.dict()
    return dict(data)


def _scheduled_window(request: dict) -> tuple[datetime, datetime] | None:
    # Trả về khoảng thời gian lịch hẹn theo giờ Việt Nam.
    if request.get("is_sos"):
        return None
    appointment_key = request.get("appointment_key")
    if isinstance(appointment_key, str) and "|" in appointment_key:
        date_part, time_part = appointment_key.split("|", 1)
        try:
            start = datetime.strptime(
                f"{date_part.strip()} {time_part.strip()}", "%Y-%m-%d %H:%M"
            ).replace(tzinfo=VN_TZ)
            # Các khung giờ đặt lịch của Customer hiện dài 60 phút.
            return start, start + timedelta(hours=1)
        except ValueError:
            pass
    text = str(request.get("issue_description") or request.get("description") or "")
    match = re.search(r"\[Hẹn:\s*([^\]]+)\]", text, re.IGNORECASE)
    if not match:
        return None
    appointment = match.group(1).strip()
    date_match = re.search(r"(\d{4}-\d{2}-\d{2})", appointment)
    time_matches = re.findall(r"\b(\d{1,2}:\d{2})\b", appointment)
    time_match = time_matches[0] if time_matches else None
    if not time_match:
        return None
    if date_match:
        appointment_date = date_match.group(1)
    elif re.search(r"\b(hôm nay|today)\b", appointment, re.IGNORECASE):
        appointment_date = datetime.now(VN_TZ).date().isoformat()
    elif re.search(r"\b(ngày mai|tomorrow)\b", appointment, re.IGNORECASE):
        appointment_date = (datetime.now(VN_TZ).date() + timedelta(days=1)).isoformat()
    else:
        return None
    try:
        start = datetime.strptime(
            f"{appointment_date} {time_match}", "%Y-%m-%d %H:%M"
        ).replace(tzinfo=VN_TZ)
        end = start + timedelta(hours=1)
        if len(time_matches) > 1:
            try:
                end = datetime.strptime(
                    f"{appointment_date} {time_matches[1]}", "%Y-%m-%d %H:%M"
                ).replace(tzinfo=VN_TZ)
                if end <= start:
                    end += timedelta(days=1)
            except ValueError:
                pass
        return start, end
    except ValueError:
        return None


def _scheduled_start_at(request: dict) -> datetime | None:
    window = _scheduled_window(request)
    return window[0] if window else None


def _is_future_appointment(request: dict, now: datetime) -> bool:
    # Kiểm tra lịch hẹn còn cách hơn 30 phút.
    scheduled_start = _scheduled_start_at(request)
    return scheduled_start is not None and now < scheduled_start - timedelta(minutes=30)


def _ensure_technician_not_busy(technician_id: str, request: dict) -> None:
    # Không cho cùng một KTV được gán/nhận hai lịch bị chồng lấn thời gian.
    # Bao gồm cả ASSIGNED/REQUESTED/CONFIRMED vì các trạng thái này đã giữ
    # lịch của KTV trong luồng quản trị.
    scheduled_start = _scheduled_start_at(request)
    if scheduled_start is not None:
        current_window = _scheduled_window(request)
        scheduled_jobs = repository.get_technician_open_requests(technician_id)
        for job in scheduled_jobs:
            if job.get("id") == request.get("id") or job.get("status") == "CANCELLED":
                continue
            job_window = _scheduled_window(job)
            overlaps = (
                current_window
                and job_window
                and current_window[0] < job_window[1]
                and job_window[0] < current_window[1]
            )
            if overlaps:
                raise AppException(
                    ErrorCode.INVALID_STATUS_TRANSITION,
                    message="Kỹ thuật viên đã có lịch hẹn bị trùng khung giờ này.",
                )

    # KTV chỉ làm một đơn đang xử lý; lịch hẹn còn xa chưa tính là đang bận.
    now_vn = datetime.now(VN_TZ)
    if _is_future_appointment(request, now_vn):
        return
    in_progress = [
        job for job in repository.get_technician_requests_in_statuses(technician_id, sorted(TECHNICIAN_IN_PROGRESS_STATUSES))
        if job.get("id") != request.get("id")
        and not (job.get("status") == "ACCEPTED" and _is_future_appointment(job, now_vn))
    ]
    if in_progress:
        current = in_progress[0]
        raise AppException(
            ErrorCode.INVALID_STATUS_TRANSITION,
            message=(
                f"Bạn đang xử lý đơn #{current.get('request_code') or str(current.get('id'))[:8]}. "
                "Vui lòng hoàn tất đơn hiện tại trước khi tiếp nhận đơn mới."
            ),
        )


def _submitted_final_cost(payload: dict):
    for field in ("final_cost", "total_amount", "totalCost"):
        if payload.get(field) is not None:
            return float(payload[field])
    return None


def _role_id(code: str) -> str:
    role = auth_repository.get_role_by_code(code)
    if not role:
        raise AppException(ErrorCode.ROLE_NOT_CONFIGURED)
    return role["id"]


def _is_role(current_user: dict, code: str) -> bool:
    user_role = str(current_user.get("role") or "").strip().upper()
    target_code = str(code or "").strip().upper()
    if user_role and (user_role == target_code or (target_code == "CUSTOMER" and user_role in {"CUSTOMER", "USER"})):
        return True
    try:
        return current_user.get("role_id") == _role_id(code)
    except Exception:
        return False


def _request_id() -> str:
    return secrets.token_hex(5).upper()


def _image_id() -> str:
    return secrets.token_hex(5).upper()


_TECH_CACHE: dict[str, tuple[float, dict]] = {}
_USER_CACHE: dict[str, tuple[float, dict]] = {}
_DEVICE_CACHE: dict[str, tuple[float, dict]] = {}
TECH_CACHE_TTL_SECONDS = 300
TECHNICIAN_LOCATION_MAX_AGE_SECONDS = 120
EARTH_RADIUS_KM = 6371.0088


def _attach_images_to_list(items: list[dict]) -> list[dict]:
    if not items:
        return []
    import time
    from concurrent.futures import ThreadPoolExecutor
    from app.db.database import supabase

    now = time.time()
    repair_ids = [item["id"] for item in items]
    customer_ids = {item["customer_id"] for item in items if item.get("customer_id")}
    device_ids = {item["device_id"] for item in items if item.get("device_id")}
    technician_ids = {item["technician_id"] for item in items if item.get("technician_id")}

    missing_cids = [cid for cid in customer_ids if cid not in _USER_CACHE or (now - _USER_CACHE[cid][0] >= TECH_CACHE_TTL_SECONDS)]
    missing_dids = [did for did in device_ids if did not in _DEVICE_CACHE or (now - _DEVICE_CACHE[did][0] >= TECH_CACHE_TTL_SECONDS)]

    def _fetch_users():
        if not missing_cids:
            return None
        try:
            return supabase.table("users").select("id,full_name,phone,email,address").in_("id", missing_cids).execute()
        except Exception:
            return None

    def _fetch_devices():
        if not missing_dids:
            return None
        try:
            return supabase.table("customer_devices").select("id,device_type,manufacturer,model_name").in_("id", missing_dids).execute()
        except Exception:
            return None

    def _fetch_payments():
        if not repair_ids:
            return None
        try:
            return supabase.table("payments").select("id,repair_id,payment_method,payment_status").in_("repair_id", repair_ids).order("created_at", desc=True).execute()
        except Exception:
            return None

    def _fetch_quotes():
        if not repair_ids:
            return None
        try:
            return supabase.table("repair_quotes").select("id,repair_id,estimated_price,parts_cost,labor_fee,status,reject_reason,diagnosis_note,created_at").in_("repair_id", repair_ids).order("created_at", desc=True).execute()
        except Exception:
            return None

    with ThreadPoolExecutor(max_workers=6) as executor:
        f_images = executor.submit(repository.get_repair_images_by_repair_ids, repair_ids)
        f_users = executor.submit(_fetch_users)
        f_devices = executor.submit(_fetch_devices)
        f_techs = executor.submit(_get_technicians_map, technician_ids)
        f_payments = executor.submit(_fetch_payments)
        f_quotes = executor.submit(_fetch_quotes)

        images = f_images.result() or []
        users_resp = f_users.result()
        devices_resp = f_devices.result()
        techs_map = f_techs.result() or {}
        payments_resp = f_payments.result()
        quotes_resp = f_quotes.result()

    if users_resp and users_resp.data:
        for u in users_resp.data:
            _USER_CACHE[u["id"]] = (now, u)

    if devices_resp and devices_resp.data:
        for d in devices_resp.data:
            _DEVICE_CACHE[d["id"]] = (now, d)

    images_by_repair = defaultdict(list)
    for img in images:
        images_by_repair[img["repair_id"]].append(img)

    payments_map = {}
    if payments_resp and payments_resp.data:
        for p in payments_resp.data:
            rid = p.get("repair_id")
            if rid and rid not in payments_map:
                payments_map[rid] = p

    quotes_map = defaultdict(list)
    if quotes_resp and quotes_resp.data:
        for q in quotes_resp.data:
            rid = q.get("repair_id")
            if rid:
                quotes_map[rid].append(q)

    for item in items:
        item["images"] = images_by_repair.get(item["id"], [])
        if item.get("customer_id"):
            item["customer"] = _USER_CACHE.get(item["customer_id"], (None, None))[1]
        if item.get("device_id"):
            item["device"] = _DEVICE_CACHE.get(item["device_id"], (None, None))[1]
        if item.get("technician_id"):
            item["technician"] = techs_map.get(item["technician_id"])

        payment = payments_map.get(item["id"], {})
        item["payment_method"] = payment.get("payment_method") or item.get("payment_method")
        item["payment_status"] = payment.get("payment_status", "UNPAID")
        quotes = quotes_map.get(item["id"], [])
        if quotes:
            q = quotes[0]
            item["quote"] = q
            item["quotes"] = quotes
            item["initial_estimate"] = float(quotes[-1].get("estimated_price") or 0)
            item["approved_estimate"] = sum(
                float(quote.get("estimated_price") or 0)
                for quote in quotes if quote.get("status") == "ACCEPTED"
            )
            if item.get("status") != "COMPLETED" and (item.get("total_amount") is None or float(item.get("total_amount") or 0) == 0) and q.get("estimated_price"):
                item["total_amount"] = float(q["estimated_price"])

    return items


def _get_technicians_map(technician_ids: set[str]) -> dict[str, dict]:
    if not technician_ids:
        return {}
    import time
    from app.db.database import supabase

    now = time.time()
    techs_map = {}
    missing_ids = []

    for tid in technician_ids:
        cached = _TECH_CACHE.get(tid)
        if cached and (now - cached[0] < TECH_CACHE_TTL_SECONDS):
            techs_map[tid] = cached[1]
        else:
            missing_ids.append(tid)

    if missing_ids:
        try:
            u_resp = supabase.table("users").select("id,full_name,phone,email,avatar_url").in_("id", missing_ids).execute()
            users_by_id = {u["id"]: u for u in (u_resp.data or [])}

            p_resp = (
                supabase.table("technician_profiles")
                .select("user_id,specialization,rating_avg,total_jobs_done,experience_years,kyc_status")
                .in_("user_id", missing_ids)
                .execute()
            )
            profiles_by_id = {p["user_id"]: p for p in (p_resp.data or [])}

            review_counts: dict[str, int] = {}
            try:
                r_resp = (
                    supabase.table("reviews")
                    .select("technician_id")
                    .in_("technician_id", missing_ids)
                    .execute()
                )
                for review in (r_resp.data or []):
                    review_tech_id = review.get("technician_id")
                    if review_tech_id:
                        review_counts[review_tech_id] = review_counts.get(review_tech_id, 0) + 1
            except Exception:
                pass

            for tid in missing_ids:
                tu = users_by_id.get(tid)
                tp = profiles_by_id.get(tid)
                if tu:
                    t_info = {
                        "id": tu["id"],
                        "name": tu.get("full_name") or "Kỹ thuật viên",
                        "phone": tu.get("phone") or "",
                        "avatar": tu.get("avatar_url") or "",
                        "specialization": (tp or {}).get("specialization") or "",
                        "rating": float(tp["rating_avg"]) if tp and tp.get("rating_avg") is not None else None,
                        "reviews": review_counts.get(tid, 0),
                        "experience_years": int(tp["experience_years"]) if tp and tp.get("experience_years") is not None else None,
                        "verified": (tp or {}).get("kyc_status") == "APPROVED",
                    }
                    _TECH_CACHE[tid] = (now, t_info)
                    techs_map[tid] = t_info
        except Exception as err:
            logger.warning(f"Failed to batch fetch technicians: {err}")

    return techs_map


def invalidate_technician_cache(technician_id: str) -> None:
    # Xóa cache KTV
    _TECH_CACHE.pop(technician_id, None)


def _list(customer_id: str | None, technician_id: str | None, request_status: str | None, page: int, limit: int):
    if request_status and request_status not in REQUEST_STATUSES:
        raise AppException(ErrorCode.VALIDATION_ERROR, message="Trạng thái yêu cầu không hợp lệ")

    items, total = repository.get_repair_requests(
        customer_id=customer_id,
        technician_id=technician_id,
        request_status=request_status,
        page=page,
        limit=limit,
    )
    return {"items": _attach_images_to_list(items), "total": total, "page": page, "limit": limit}


def _parse_location_timestamp(value):
    if not value:
        return None
    try:
        parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        return parsed.replace(tzinfo=timezone.utc) if parsed.tzinfo is None else parsed.astimezone(timezone.utc)
    except (TypeError, ValueError):
        return None


def _has_fresh_technician_location(technician: dict, now: datetime | None = None) -> bool:
    if technician.get("last_latitude") is None or technician.get("last_longitude") is None:
        return False
    timestamp = _parse_location_timestamp(technician.get("last_location_at"))
    if not timestamp:
        return False
    now = now or datetime.now(timezone.utc)
    return 0 <= (now - timestamp).total_seconds() <= TECHNICIAN_LOCATION_MAX_AGE_SECONDS


def _haversine_km(lat_a: float, lng_a: float, lat_b: float, lng_b: float) -> float:
    lat_delta = math.radians(lat_b - lat_a)
    lng_delta = math.radians(lng_b - lng_a)
    a = math.sin(lat_delta / 2) ** 2 + math.cos(math.radians(lat_a)) * math.cos(math.radians(lat_b)) * math.sin(lng_delta / 2) ** 2
    return EARTH_RADIUS_KM * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _skill_matches_device(technician: dict, device_type: str | None) -> bool:
    if not device_type:
        return True
    skill = (technician.get("skills") or "BOTH").upper()
    return skill in {"BOTH", str(device_type).upper()}


def _find_best_sos_technician(
    customer_lat=None,
    customer_lng=None,
    device_type: str | None = None,
    exclude_tech_ids=None,
    appointment_start: datetime | None = None,
):
    from app.db.database import supabase

    excluded = set(exclude_tech_ids or [])

    try:
        resp = (
            supabase.table("technician_profiles")
            .select("*")
            .eq("is_online", True)
            .eq("kyc_status", "APPROVED")
            .execute()
        )
        techs = resp.data if resp and resp.data else []

        # is_online chỉ có hiệu lực khi heartbeat/GPS còn mới. Nếu browser
        # không kịp gửi lệnh offline lúc đóng app, KTV vẫn bị loại khỏi điều phối.
        techs = [
            technician for technician in techs
            if technician.get("user_id") not in excluded
            and _skill_matches_device(technician, device_type)
            and _has_fresh_technician_location(technician)
        ]
        if techs:
            # Tài khoản bị khóa/xóa không được nhận việc dù hồ sơ vẫn online.
            users_resp = (
                supabase.table("users")
                .select("id,is_active")
                .in_("id", [t["user_id"] for t in techs])
                .execute()
            )
            active_ids = {u["id"] for u in (users_resp.data or []) if u.get("is_active")}
            techs = [t for t in techs if t["user_id"] in active_ids]
        if not techs:
            logger.info("No eligible SOS technician: active account, online, KYC-approved, matching skill and fresh GPS are required")
            return None

        active_statuses = sorted(TECHNICIAN_IN_PROGRESS_STATUSES | {"PENDING", "REQUESTED", "CONFIRMED", "ASSIGNED"})
        job_counts = {}
        busy_tech_ids = set()
        try:
            active_jobs_resp = (
                supabase.table("repair_requests")
                # Keep this query compatible with deployments that have not
                # applied the optional appointment_key migration yet.
                .select("id,technician_id,status,is_sos,issue_description")
                .in_("status", active_statuses)
                .execute()
            )
            if active_jobs_resp and active_jobs_resp.data:
                for job in active_jobs_resp.data:
                    tid = job.get("technician_id")
                    if tid:
                        job_counts[tid] = job_counts.get(tid, 0) + 1
                        job_start = _scheduled_start_at(job)
                        if appointment_start is not None and job_start == appointment_start:
                            busy_tech_ids.add(tid)
                        elif not _is_future_appointment(job, datetime.now(VN_TZ)):
                            busy_tech_ids.add(tid)
        except Exception as j_err:
            logger.warning(f"Failed to fetch active jobs count: {j_err}")

        techs = [t for t in techs if t.get("user_id") not in busy_tech_ids]

        c_lat = float(customer_lat) if customer_lat is not None else None
        c_lng = float(customer_lng) if customer_lng is not None else None

        def tech_sort_key(t):
            t_id = t["user_id"]
            active_count = job_counts.get(t_id, 0)

            dist = 999999.0
            if c_lat is not None and c_lng is not None:
                t_lat = t.get("last_latitude")
                t_lng = t.get("last_longitude")
                if t_lat is not None and t_lng is not None:
                    try:
                        dist = _haversine_km(c_lat, c_lng, float(t_lat), float(t_lng))
                    except (TypeError, ValueError):
                        pass

            rating = t.get("rating_avg") or 0.0
            return (active_count, dist, -rating)

        techs.sort(key=tech_sort_key)
        best_tech = techs[0]
        logger.info(f"Selected SOS Tech {best_tech['user_id']} (Active jobs: {job_counts.get(best_tech['user_id'], 0)}, Rating: {best_tech.get('rating_avg')})")
        return best_tech["user_id"]
    except Exception as e:
        logger.warning(f"Error finding best SOS technician: {e}")
        return None


def _declined_technician_ids(repair_id: str) -> set:
    # Lấy các KTV đã từ chối, quá hạn hoặc bị chuyển khỏi đơn.
    return {
        h["changed_by"]
        for h in repository.get_status_history(repair_id) or []
        if h.get("changed_by") and h.get("status") in {"REJECTED", "REQUESTED", "ASSIGNED"}
    }


def _parse_utc(raw_ts):
    if not raw_ts:
        return None
    if not isinstance(raw_ts, str):
        return raw_ts
    try:
        parsed = datetime.fromisoformat(raw_ts.replace("Z", "+00:00"))
    except ValueError:
        return None
    return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)


def reassign_timed_out_requests(timeout_seconds: int = 120) -> int:
    # Điều phối lại đơn SOS quá hạn hoặc chưa có KTV.
    from app.db.database import supabase
    from datetime import timedelta

    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(seconds=timeout_seconds)

    try:
        resp = (
            supabase.table(REPAIR_REQUESTS_TABLE)
            .select("*")
            .in_("status", ["ASSIGNED", "REQUESTED"])
            .eq("is_sos", True)
            .execute()
        )
        candidates = resp.data if resp and resp.data else []
    except Exception as err:
        logger.warning(f"Error querying SOS requests for dispatch check: {err}")
        return 0

    reassigned_count = 0

    for req in candidates:
        if not req.get("is_sos"):
            continue
        req_id = req["id"]
        status = req.get("status")
        current_tech_id = req.get("technician_id")

        if status == "ASSIGNED":
            assigned_dt = _parse_utc(req.get("assigned_at") or req.get("updated_at") or req.get("created_at"))
            if assigned_dt is None or assigned_dt >= cutoff:
                continue
        elif current_tech_id:
            continue

        try:
            excluded_tech_ids = _declined_technician_ids(req_id)
        except Exception as h_err:
            logger.warning(f"Skip auto-dispatch for {req_id}: cannot read history ({h_err})")
            continue
        if current_tech_id:
            excluded_tech_ids.add(current_tech_id)

        next_tech_id = _find_best_sos_technician(
            customer_lat=req.get("latitude"),
            customer_lng=req.get("longitude"),
            device_type=repository.get_device_type(req.get("device_id")),
            exclude_tech_ids=excluded_tech_ids,
        )
        if status == "REQUESTED" and not next_tech_id:
            continue  # Vẫn chưa có KTV khả dụng, thử lại ở lượt quét sau.

        now_iso = now.isoformat()
        changed_user_id = current_tech_id or req.get("customer_id")
        if next_tech_id:
            update_data = {
                "technician_id": next_tech_id,
                "status": "ASSIGNED",
                "assigned_at": now_iso,
                "updated_by": changed_user_id,
            }
        else:
            update_data = {
                "technician_id": None,
                "status": "REQUESTED",
                "assigned_at": None,
                "updated_by": changed_user_id,
            }

        # Chỉ ghi nếu đơn vẫn đúng như lúc đọc: KTV có thể vừa nhận đơn hoặc admin vừa đổi phân công.
        expected = {"status": status, "technician_id": current_tech_id}
        if status == "ASSIGNED" and req.get("assigned_at"):
            expected["assigned_at"] = req["assigned_at"]
        updated_record = repository.update_repair_request(req_id, update_data, expected=expected)
        if not updated_record:
            logger.info(f"Skip stale auto-dispatch for {req_id}: request changed concurrently")
            continue

        if current_tech_id:
            repository.add_status_history({
                "id": _request_id(),
                "repair_id": req_id,
                "status": "REJECTED",
                "changed_by": current_tech_id,
                "note": f"KTV không phản hồi trong {timeout_seconds // 60} phút; hệ thống tự động từ chối phân công.",
            })

        if next_tech_id:
            note = (
                f"KTV trước quá {timeout_seconds // 60} phút không phản hồi. Hệ thống tự động chuyển sang KTV mới: {next_tech_id}"
                if current_tech_id else f"Đã có KTV khả dụng. Hệ thống tự động phân công cho KTV: {next_tech_id}"
            )
            repository.add_status_history({
                "id": _request_id(),
                "repair_id": req_id,
                "status": "ASSIGNED",
                "changed_by": changed_user_id,
                "note": note,
            })
            try:
                from app.notifications import service as notif_service
                notif_service.notify_request_assigned(updated_record, next_tech_id)
            except Exception as n_err:
                logger.warning(f"Failed to notify auto-dispatched technician for {req_id}: {n_err}")
            logger.info(f"Auto-dispatched SOS request {req_id} from {current_tech_id} to {next_tech_id}")
        else:
            repository.add_status_history({
                "id": _request_id(),
                "repair_id": req_id,
                "status": "REQUESTED",
                "changed_by": changed_user_id,
                "note": f"KTV trước quá {timeout_seconds // 60} phút không phản hồi, hiện hết KTV khả dụng khác (chuyển sang chờ Admin điều phối)",
            })
            logger.info(f"Timed out request {req_id} reverted to REQUESTED (no other techs available)")

        reassigned_count += 1

    # Worker quét định kỳ cũng phát cảnh báo cho đơn hẹn đã quá giờ.
    # Repository tự khử trùng theo repair_id nên không gửi lặp.
    notify_overdue_accepted_appointments()
    return reassigned_count


def notify_overdue_accepted_appointments() -> int:
    """Notify technicians whose accepted appointment has passed its start time."""
    from app.db.database import supabase

    try:
        query = (
            supabase.table(REPAIR_REQUESTS_TABLE)
            .select("id,technician_id,status,appointment_key,issue_description,is_sos,location_address")
            .eq("status", "ACCEPTED")
            .not_.is_("technician_id", "null")
        )
        try:
            response = query.execute()
        except Exception:
            # DB cũ chưa có appointment_key: vẫn cảnh báo được bằng ghi chú lịch.
            response = (
                supabase.table(REPAIR_REQUESTS_TABLE)
                .select("id,technician_id,status,issue_description,is_sos,location_address")
                .eq("status", "ACCEPTED")
                .not_.is_("technician_id", "null")
                .execute()
            )
        requests = response.data if response and response.data else []
    except Exception as err:
        logger.warning(f"Error querying overdue appointments: {err}")
        return 0

    now = datetime.now(VN_TZ)
    notified = 0
    for request in requests:
        scheduled_start = _scheduled_start_at(request)
        if scheduled_start is None or scheduled_start >= now:
            continue
        try:
            from app.notifications import service as notif_service
            if notif_service.notify_appointment_overdue(request):
                notified += 1
        except Exception as err:
            logger.warning(f"Failed to notify overdue appointment {request.get('id')}: {err}")
    return notified


def _validate_booking_schedule(booking_date: str | None, booking_slot: str | None):
    from app.core.validation import validate_booking
    try:
        validate_booking(booking_date, booking_slot)
    except ValueError as error:
        raise AppException(ErrorCode.VALIDATION_ERROR, message=str(error)) from error


def create_request(current_user: dict, data):
    is_admin = _is_role(current_user, ADMIN_ROLE_CODE)
    if not is_admin and not _is_role(current_user, CUSTOMER_ROLE_CODE):
        raise AppException(ErrorCode.FORBIDDEN)
    payload = _payload(data)
    customer_id = current_user["sub"]
    if is_admin:
        customer_id = payload.get("customer_id")
        customer = auth_repository.get_user_by_id(customer_id) if customer_id else None
        if not customer or customer.get("role_id") != _role_id(CUSTOMER_ROLE_CODE):
            raise AppException(ErrorCode.USER_NOT_FOUND, message="Vui lòng chọn khách hàng hợp lệ để tạo đơn.")

    device_id = payload.get("device_id")
    device = repository.get_device_for_customer(device_id, customer_id) if device_id else None
    if not device:
        if is_admin:
            raise AppException(ErrorCode.DEVICE_ACCESS_DENIED, message="Thiết bị được chọn không thuộc khách hàng này.")
        raise AppException(ErrorCode.DEVICE_ACCESS_DENIED)

    from app.core.validation import validated_payload
    from app.repair_requests.schemas import RepairRequestCreate
    payload = validated_payload(RepairRequestCreate, data)

    issue_type = (payload.get("issue_type") or "").upper()
    ISSUE_TYPE_MAP = {
        "CONTROLLER": "OTHER",
        "WHEEL": "TIRE",
        "FRAME": "BRAKE",
        "GENERAL": "OTHER",
    }
    issue_type = ISSUE_TYPE_MAP.get(issue_type, issue_type)
    if issue_type not in ISSUE_TYPES:
        issue_type = "OTHER"


    description = payload.get("description") or payload.get("issue_description") or ""
    address = payload.get("address_detail") or payload.get("location_address") or ""
    lat = payload.get("location_lat") if payload.get("location_lat") is not None else payload.get("latitude")
    lng = payload.get("location_lng") if payload.get("location_lng") is not None else payload.get("longitude")

    booking_date = payload.get("booking_date") or payload.get("appointment_date")
    booking_slot = payload.get("booking_slot") or payload.get("appointment_slot")
    _validate_booking_schedule(booking_date, booking_slot)
    requested_start = None
    appointment_key = None
    if booking_date or booking_slot:
        date_str = "Hôm nay" if booking_date == "TODAY" else ("Ngày mai" if booking_date == "TOMORROW" else (booking_date or ""))
        slot_str = booking_slot or ""
        sched_note = f"[Hẹn: {date_str} {slot_str}]".strip()
        if sched_note and sched_note not in description:
            description = f"{description} | {sched_note}".strip() if description else sched_note
        requested_start = _scheduled_start_at({"issue_description": sched_note})
        if requested_start is not None:
            appointment_key = requested_start.strftime("%Y-%m-%d|%H:%M")

    if requested_start is not None:
        # Lịch chưa được phân công vẫn phải chiếm khung giờ của chính khách
        # hàng ngay từ lúc tạo, thay vì đợi đến bước Admin gán KTV mới phát hiện.
        try:
            existing_bookings = repository.get_open_customer_requests(customer_id)
        except Exception as err:
            logger.error(f"Cannot verify duplicate appointment slot: {err}")
            raise AppException(
                ErrorCode.INTERNAL_SERVER_ERROR,
                message="Không thể kiểm tra lịch hẹn hiện tại. Vui lòng thử lại sau.",
            ) from err
        if any(_scheduled_start_at(item) == requested_start for item in existing_bookings):
            raise AppException(
                ErrorCode.DUPLICATE_REQUEST,
                message="Bạn đã có lịch hẹn trong khung giờ này. Vui lòng chọn khung giờ khác.",
            )
    
    is_sos = payload.get("is_sos", False)
    if payload.get("request_type") in ["SOS", "EMERGENCY"]:
        is_sos = True

    if is_sos:
        if lat is None or lng is None:
            raise AppException(ErrorCode.VALIDATION_ERROR, message="Yêu cầu SOS cần bật vị trí GPS để điều phối KTV.")
        try:
            valid_coordinates = -90 <= float(lat) <= 90 and -180 <= float(lng) <= 180
        except (TypeError, ValueError):
            valid_coordinates = False
        if not valid_coordinates:
            raise AppException(ErrorCode.VALIDATION_ERROR, message="Tọa độ GPS không hợp lệ.")

    images = payload.get("image_urls") or payload.get("inspection_images") or payload.get("images") or []

    address = address or "Địa chỉ chưa xác định"

    # Chống tạo trùng khi khách bấm gửi nhiều lần liên tiếp: trả lại đơn vừa tạo
    # thay vì tạo đơn mới (và tránh gán thêm một KTV cho đơn SOS trùng).
    duplicate_window_start = (datetime.now(timezone.utc) - timedelta(seconds=DUPLICATE_REQUEST_WINDOW_SECONDS)).isoformat()
    existing = repository.find_recent_open_request(customer_id, device_id, bool(is_sos), duplicate_window_start)
    if existing:
        logger.info(f"Duplicate create_request from {customer_id} ignored, returning {existing['id']}")
        return fetch_request(existing["id"], current_user)

    request_id = _request_id()
    tech_id = None
    initial_status = "REQUESTED"

    # Auto-assign available technician for emergency SOS requests
    if is_sos:
        tech_id = _find_best_sos_technician(lat, lng, device_type=(device or {}).get("device_type"))
        if tech_id:
            initial_status = "ASSIGNED"

    record = {
        "id": request_id,
        "request_code": _request_id(),
        "customer_id": customer_id,
        "technician_id": tech_id,
        "appointment_key": appointment_key,
        "device_id": device_id,
        "issue_type": issue_type,
        "issue_description": description,
        "location_address": address,
        "latitude": lat,
        "longitude": lng,
        "is_sos": is_sos,
        "status": initial_status,
        "created_by": current_user["sub"],
        "updated_by": current_user["sub"],
    }
    try:
        created = repository.create_repair_request(record)
    except APIError as error:
        if getattr(error, "code", None) == "PGRST204" and appointment_key:
            # Keep older deployments usable until the appointment migration is
            # applied. The application-level duplicate check still protects
            # normal sequential requests; the unique index protects races
            # once the migration is live.
            logger.error(
                "repair_requests.appointment_key is missing; retrying without it. "
                "Apply the prevent_duplicate_customer_appointments migration."
            )
            legacy_record = dict(record)
            legacy_record.pop("appointment_key", None)
            created = repository.create_repair_request(legacy_record)
        elif getattr(error, "code", None) == "23505" and appointment_key:
            # The partial unique index is the final guard against two concurrent
            # booking requests for the same customer and appointment slot.
            raise AppException(
                ErrorCode.DUPLICATE_REQUEST,
                message="Bạn đã có lịch hẹn trong khung giờ này. Vui lòng chọn khung giờ khác.",
            ) from error
        else:
            raise
    if not created:
        raise AppException(ErrorCode.INTERNAL_SERVER_ERROR)

    for idx, img_url in enumerate(images):
        if not img_url:
            continue
        clean_url = str(img_url).strip()
        if clean_url.startswith("blob:") or clean_url.startswith("data:"):
            continue

        try:
            repository.create_repair_image({
                "id": _image_id(),
                "repair_id": request_id,
                "image_url": clean_url,
                "image_type": "BEFORE_REPAIR",
                "created_by": current_user["sub"],
            })
        except Exception as img_err:
            logger.warning(f"Failed to create repair image record: {img_err}")

    try:
        from app.notifications import service as notif_service
        notif_service.notify_request_created(record)
        if tech_id:
            notif_service.notify_request_assigned(record, tech_id)
    except Exception as notif_err:
        logger.warning(f"Failed to trigger notifications for create_request: {notif_err}")

    return fetch_request(request_id, current_user)


def fetch_my_requests(current_user: dict, request_status: str | None, page: int, limit: int):
    if not _is_role(current_user, CUSTOMER_ROLE_CODE):
        raise AppException(ErrorCode.FORBIDDEN)
    return _list(current_user["sub"], None, request_status, page, limit)


def fetch_technician_requests(current_user: dict, request_status: str | None, page: int, limit: int):
    if not _is_role(current_user, TECHNICIAN_ROLE_CODE):
        raise AppException(ErrorCode.FORBIDDEN)
    return _list(None, current_user["sub"], request_status, page, limit)


def fetch_mapbox_public_token(current_user: dict):
    if not (
        _is_role(current_user, TECHNICIAN_ROLE_CODE)
        or _is_role(current_user, CUSTOMER_ROLE_CODE)
        or _is_role(current_user, ADMIN_ROLE_CODE)
    ):
        raise AppException(ErrorCode.FORBIDDEN)
    token = os.getenv("MAPBOX_ACCESS_TOKEN")
    if not token or not token.startswith("pk."):
        logger.error("A Mapbox public token is required to render the map")
        raise AppException(ErrorCode.SERVICE_UNAVAILABLE, message="Bản đồ chưa được cấu hình.")
    return {"access_token": token}


def reverse_geocode_location(latitude: float, longitude: float, current_user: dict):
    if not (_is_role(current_user, CUSTOMER_ROLE_CODE) or _is_role(current_user, TECHNICIAN_ROLE_CODE) or _is_role(current_user, ADMIN_ROLE_CODE)):
        raise AppException(ErrorCode.FORBIDDEN)
    if not (-90 <= latitude <= 90 and -180 <= longitude <= 180):
        raise AppException(ErrorCode.VALIDATION_ERROR, message="Tọa độ GPS không hợp lệ.")

    token = os.getenv("MAPBOX_ACCESS_TOKEN")
    if not token:
        raise AppException(ErrorCode.SERVICE_UNAVAILABLE, message="Dịch vụ địa chỉ chưa được cấu hình.")
    try:
        response = requests.get(
            "https://api.mapbox.com/search/geocode/v6/reverse",
            # Không giới hạn quốc gia để hỗ trợ tọa độ trên toàn thế giới.
            params={"longitude": longitude, "latitude": latitude, "language": "vi", "access_token": token},
            timeout=8,
        )
        response.raise_for_status()
        features = response.json().get("features") or []
        if not features:
            raise ValueError("Mapbox returned no address")
        properties = features[0].get("properties") or {}
        context = properties.get("context") or {}
        address = properties.get("name_preferred") or properties.get("name") or properties.get("full_address") or ""
        def _name(key: str) -> str:
            return (context.get(key) or {}).get("name") or ""

        # Thành phố: place = region = "Hà Nội". Nông thôn: place là xã/thị trấn, tỉnh nằm ở region.
        province = _name("region") or _name("place") or _name("country")
        place = _name("place")
        ward = (
            _name("neighborhood")
            or _name("locality")
            or (place if place and place != province else "")
            or _name("district")
        )
        return {"address": address, "ward": ward, "province": province, "latitude": latitude, "longitude": longitude}
    except (requests.RequestException, KeyError, TypeError, ValueError) as error:
        logger.warning("Mapbox reverse geocoding failed: %s", error)
        raise AppException(ErrorCode.SERVICE_UNAVAILABLE, message="Chưa thể xác định địa chỉ từ GPS.")


def fetch_route_for_technician(request_id: str, current_user: dict):
    # Lấy lộ trình hiện tại của KTV được phân công.
    if not _is_role(current_user, TECHNICIAN_ROLE_CODE):
        raise AppException(ErrorCode.FORBIDDEN)

    request = repository.get_repair_request_by_id(request_id)
    if not request:
        raise AppException(ErrorCode.REQUEST_NOT_FOUND)
    if request.get("technician_id") != current_user["sub"]:
        raise AppException(ErrorCode.TECHNICIAN_NOT_ASSIGNED)

    technician = repository.get_technician_profile(current_user["sub"])
    origin_lat = (technician or {}).get("last_latitude")
    origin_lng = (technician or {}).get("last_longitude")
    destination_lat = request.get("latitude")
    destination_lng = request.get("longitude")
    if origin_lat is None or origin_lng is None:
        raise AppException(
            ErrorCode.VALIDATION_ERROR,
            message="Chưa có vị trí GPS hiện tại của thợ để tính đường đi.",
        )
    if destination_lat is None or destination_lng is None:
        raise AppException(
            ErrorCode.VALIDATION_ERROR,
            message="Đơn này chưa có vị trí GPS của khách hàng. Hãy dùng đơn được tạo sau khi bật GPS.",
        )

    token = os.getenv("MAPBOX_ACCESS_TOKEN")
    if not token:
        logger.error("MAPBOX_ACCESS_TOKEN is not configured")
        raise AppException(ErrorCode.SERVICE_UNAVAILABLE, message="Dịch vụ chỉ đường chưa được cấu hình.")

    try:
        coordinates = f"{float(origin_lng)},{float(origin_lat)};{float(destination_lng)},{float(destination_lat)}"
    except (TypeError, ValueError):
        raise AppException(ErrorCode.VALIDATION_ERROR, message="Tọa độ GPS không hợp lệ.")

    try:
        response = requests.get(
            f"https://api.mapbox.com/directions/v5/mapbox/driving-traffic/{coordinates}",
            params={
                "access_token": token,
                "alternatives": "false",
                "overview": "full",
                "geometries": "geojson",
            },
            timeout=8,
        )
        response.raise_for_status()
        routes = response.json().get("routes") or []
        if not routes:
            raise ValueError("Mapbox returned no route")
        route = routes[0]
        geometry = route.get("geometry", {}).get("coordinates")
        if not isinstance(geometry, list) or len(geometry) < 2:
            raise ValueError("Mapbox route has no GeoJSON geometry")
        return {
            "distance_meters": round(float(route["distance"]), 1),
            "duration_seconds": round(float(route["duration"]), 1),
            "profile": "driving-traffic",
            "geometry": geometry,
            "origin": [float(origin_lng), float(origin_lat)],
            "destination": [float(destination_lng), float(destination_lat)],
        }
    except (requests.RequestException, KeyError, TypeError, ValueError) as error:
        logger.warning("Mapbox route request failed for repair %s: %s", request_id, error)
        raise AppException(ErrorCode.SERVICE_UNAVAILABLE, message="Chưa thể tính thời gian di chuyển, vui lòng thử lại.")


def fetch_all_requests(current_user: dict, request_status: str | None, customer_id: str | None, technician_id: str | None, page: int, limit: int):
    if not _is_role(current_user, ADMIN_ROLE_CODE):
        raise AppException(ErrorCode.FORBIDDEN)
    return _list(customer_id, technician_id, request_status, page, limit)


def fetch_request(request_id: str, current_user: dict):
    # Ultra-optimized: fetch repair request + images + device + quotes in ONE roundtrip
    try:
        from app.db.database import supabase
        resp = (
            supabase.table("repair_requests")
            .select("""
                *,
                repair_requests_images(*),
                customer_devices(id,device_type,manufacturer,model_name),
                repair_quotes(*)
            """)
            .or_(f"id.eq.{request_id},request_code.eq.{request_id}")
            .maybe_single()
            .execute()
        )
        request = resp.data if resp else None
    except Exception as query_err:
        logger.warning(f"Mega query failed in fetch_request, falling back: {query_err}")
        request = repository.get_repair_request_by_id(request_id)

    if not request:
        raise AppException(ErrorCode.REQUEST_NOT_FOUND)
    can_view = (
        _is_role(current_user, ADMIN_ROLE_CODE)
        or (_is_role(current_user, CUSTOMER_ROLE_CODE) and request["customer_id"] == current_user["sub"])
        or (_is_role(current_user, TECHNICIAN_ROLE_CODE) and request.get("technician_id") == current_user["sub"])
    )
    if not can_view:
        raise AppException(ErrorCode.FORBIDDEN)

    request_data = dict(request)

    # 1. Unpack images
    if "repair_requests_images" in request_data:
        images = request_data.pop("repair_requests_images") or []
        images.sort(key=lambda img: img.get("created_at") or "")
        request_data["images"] = images
    elif "images" not in request_data:
        request_data["images"] = repository.get_repair_images(request_data.get("id") or request_id)

    # 2. Unpack device
    if request_data.get("customer_devices"):
        request_data["device"] = request_data.pop("customer_devices")
    elif request.get("device_id") and "device" not in request_data:
        try:
            d_resp = supabase.table("customer_devices").select("id,device_type,manufacturer,model_name").eq("id", request["device_id"]).maybe_single().execute()
            if d_resp and d_resp.data:
                request_data["device"] = d_resp.data
        except Exception:
            pass

    # 3. Unpack quotes and load items from repair_quote_items
    quotes = request_data.pop("repair_quotes", None)
    actual_id = request_data.get("id") or request_id
    if quotes is None:
        try:
            quotes = repository.get_quotes_by_repair_id(actual_id) or []
        except Exception:
            quotes = []

    for q in quotes:
        items = q.pop("quote_items", None) or q.get("items") or []
        if not items:
            try:
                items = repository.get_quote_items(q["id"]) or []
            except Exception:
                items = []
        q["items"] = items
    quotes.sort(key=lambda q: q.get("created_at") or "", reverse=True)

    if quotes:
        latest_quote = quotes[0]
        request_data["quote"] = latest_quote
        request_data["quotes"] = quotes

        accepted_quotes = [q for q in quotes if q.get("status") == "ACCEPTED"]
        pending_quotes = [q for q in quotes if q.get("status") == "PENDING"]
        sorted_by_date = sorted(quotes, key=lambda q: q.get("created_at") or "")
        initial_quote = sorted_by_date[0] if sorted_by_date else latest_quote

        request_data["initial_estimate"] = float(initial_quote.get("estimated_price") or 0)
        if accepted_quotes:
            request_data["approved_estimate"] = sum(float(q.get("estimated_price") or 0) for q in accepted_quotes)
        else:
            request_data["approved_estimate"] = 0.0
        request_data["pending_quote"] = pending_quotes[0] if pending_quotes else None

        if request_data.get("status") == "COMPLETED":
            request_data["final_cost"] = float(request_data.get("total_amount") or 0)
        elif (request_data.get("total_amount") is None or float(request_data.get("total_amount") or 0) == 0):
            request_data["total_amount"] = (
                request_data["approved_estimate"]
                if accepted_quotes
                else float(latest_quote.get("estimated_price") or 0)
            )

    # 4. Payment status is independent of repair completion.
    try:
        from app.payments.repository import get_payment_by_repair_id
        p_rec = get_payment_by_repair_id(actual_id)
        if isinstance(p_rec, dict):
            request_data["payment_method"] = p_rec.get("payment_method")
            request_data["payment_status"] = p_rec.get("payment_status", "UNPAID")
        else:
            request_data["payment_status"] = "UNPAID"
    except Exception as pm_err:
        logger.warning(f"Failed to load payment info in fetch_request: {pm_err}")

    # 5. Customer info (cached in memory)
    cid = request.get("customer_id")
    if cid:
        import time
        now = time.time()
        cached_cust = _USER_CACHE.get(cid)
        if cached_cust and (now - cached_cust[0] < 300):
            request_data["customer"] = cached_cust[1]
        else:
            u = auth_repository.get_user_by_id(cid)
            if u:
                _USER_CACHE[cid] = (now, u)
                request_data["customer"] = u

    # 6. Technician info (cached in memory)
    tid = request.get("technician_id")
    if tid:
        t_map = _get_technicians_map({tid})
        if tid in t_map:
            request_data["technician"] = t_map[tid]

    return request_data


def fetch_request_status_sync(request_id: str, current_user: dict):
    request = repository.get_repair_request_by_id(request_id)
    if not request:
        raise AppException(ErrorCode.REQUEST_NOT_FOUND)

    can_view = (
        _is_role(current_user, ADMIN_ROLE_CODE)
        or (_is_role(current_user, CUSTOMER_ROLE_CODE) and request["customer_id"] == current_user["sub"])
        or (_is_role(current_user, TECHNICIAN_ROLE_CODE) and request.get("technician_id") == current_user["sub"])
    )
    if not can_view:
        raise AppException(ErrorCode.FORBIDDEN)

    technician_info = None
    if request.get("technician_id"):
        tech_user = auth_repository.get_user_by_id(request["technician_id"])
        tech_profile = repository.get_technician_profile(request["technician_id"])
        if tech_user:
            technician_info = {
                "id": tech_user.get("id"),
                "name": tech_user.get("full_name", ""),
                "phone": tech_user.get("phone", ""),
                # Only the public profile photo; KYC documents must never reach customers.
                "avatar": tech_user.get("avatar_url") or "",
                "rating": float(tech_profile.get("rating_avg", 5.0)) if tech_profile else 5.0,
            }

    return {
        "request_id": request["id"],
        "current_status": request["status"],
        "technician_info": technician_info,
        "last_updated": request.get("updated_at") or request.get("created_at"),
    }


def _respond_to_pending_quote(request_id: str, payload: dict, fields: dict):
    # Ghi phản hồi vào báo giá đang chờ và chống duyệt bản cũ.
    from app.db.database import supabase
    query = supabase.table("repair_quotes").update(fields).eq("repair_id", request_id).eq("status", "PENDING")
    quote_id = payload.get("quote_id")
    if quote_id:
        quote = next((q for q in repository.get_quotes_by_repair_id(request_id) or [] if q.get("id") == quote_id), None)
        if not quote or quote.get("status") != "PENDING":
            raise AppException(ErrorCode.QUOTE_ALREADY_DECIDED)
        seen_at = payload.get("quote_updated_at")
        if seen_at and quote.get("updated_at"):
            if datetime.fromisoformat(str(seen_at)) != datetime.fromisoformat(str(quote["updated_at"])):
                raise AppException(ErrorCode.QUOTE_ALREADY_DECIDED, message="Kỹ thuật viên vừa cập nhật báo giá. Vui lòng xem lại báo giá mới trước khi phản hồi.")
            query = query.eq("updated_at", quote["updated_at"])
        query = query.eq("id", quote_id)
    return query.execute()


def _get_payment(request_id: str):
    from app.payments import repository as payment_repository
    return payment_repository.get_payment_by_repair_id(request_id)


def _validated_final_cost(request_id: str, submitted_cost: float | None) -> float:
    # Kiểm tra chi phí thực tế không vượt báo giá đã duyệt.
    try:
        quotes = repository.get_quotes_by_repair_id(request_id) or []
    except Exception as check_err:
        logger.warning(f"Error checking quote vs final cost: {check_err}")
        raise AppException(ErrorCode.DATABASE_ERROR) from check_err
    if any(q.get("status") == "PENDING" for q in quotes):
        raise AppException(ErrorCode.QUOTE_NOT_ACCEPTED, message="Báo giá bổ sung đang chờ khách hàng duyệt. Chưa thể hoàn tất sửa chữa.")
    accepted_quotes = [q for q in quotes if q.get("status") == "ACCEPTED"]
    if not accepted_quotes:
        raise AppException(ErrorCode.QUOTE_NOT_ACCEPTED)
    est_price = sum(float(q.get("estimated_price") or 0) for q in accepted_quotes)
    final_cost = submitted_cost if submitted_cost is not None else est_price
    if final_cost > est_price:
        raise AppException(
            ErrorCode.VALIDATION_ERROR,
            message=f"Chi phí thực tế ({final_cost:,.0f} đ) vượt quá báo giá đã duyệt ({est_price:,.0f} đ). Vui lòng gửi báo giá bổ sung để khách hàng phê duyệt trước khi hoàn tất.",
        )
    return final_cost


def submit_final_cost(request_id: str, data: dict, current_user: dict):
    # KTV chốt chi phí; đơn chuyển sang chờ khách thanh toán.
    request = repository.get_repair_request_by_id(request_id)
    if not request:
        raise AppException(ErrorCode.REQUEST_NOT_FOUND)
    if not (_is_role(current_user, TECHNICIAN_ROLE_CODE) and request.get("technician_id") == current_user["sub"]):
        raise AppException(ErrorCode.FORBIDDEN)
    if request.get("status") not in {"ESTIMATE_APPROVED", "REPAIRING"}:
        raise AppException(ErrorCode.INVALID_STATUS_TRANSITION, message="Chỉ chốt chi phí khi đơn đang sửa chữa.")

    from app.core.validation import validated_payload
    from app.repair_requests.schemas import FinalCostRequest
    payload = validated_payload(FinalCostRequest, data)
    final_cost = _validated_final_cost(request_id, float(payload["final_cost"]))

    payment = _get_payment(request_id)
    if payment and payment.get("payment_status") in {"PENDING", "PAID"} and not math.isclose(
        float(payment.get("amount") or 0), final_cost, rel_tol=0, abs_tol=0.01
    ):
        raise AppException(
            ErrorCode.INVALID_STATUS_TRANSITION,
            message=f"Khách hàng đã báo thanh toán {float(payment.get('amount') or 0):,.0f} đ nên không thể đổi chi phí thực tế.",
        )

    if not repository.update_repair_request(request_id, {"total_amount": final_cost, "updated_by": current_user["sub"]}):
        raise AppException(ErrorCode.DATABASE_ERROR)
    return fetch_request(request_id, current_user)


def update_request_status(request_id: str, current_user: dict, data):
    request = repository.get_repair_request_by_id(request_id)
    if not request:
        raise AppException(ErrorCode.REQUEST_NOT_FOUND)
    actual_id = request["id"]
    from app.core.validation import validated_payload
    from app.repair_requests.schemas import RepairRequestStatusUpdate
    payload = validated_payload(RepairRequestStatusUpdate, data)
    new_status = (payload.get("status") or "").upper()
    if new_status not in REQUEST_STATUSES:
        raise AppException(ErrorCode.VALIDATION_ERROR, message="Trạng thái yêu cầu không hợp lệ")

    is_admin = _is_role(current_user, ADMIN_ROLE_CODE)
    is_customer = (
        (_is_role(current_user, CUSTOMER_ROLE_CODE) or _is_role(current_user, "USER"))
        and str(request.get("customer_id")) == str(current_user.get("sub"))
    )

    # Nếu trạng thái không thay đổi và không có chi phí/thông tin cập nhật kèm theo, coi như thành công ngay lập tức (Idempotent)
    if new_status == request["status"]:
        submitted_cost = _submitted_final_cost(payload)
        if submitted_cost is None and not payload.get("cancel_reason"):
            return fetch_request(actual_id, current_user)

    if _is_role(current_user, TECHNICIAN_ROLE_CODE) and request.get("technician_id") != current_user["sub"]:
        raise AppException(
            ErrorCode.FORBIDDEN,
            message="Bạn không phải là kỹ thuật viên phụ trách đơn này hoặc đơn đã được chuyển giao cho thợ khác."
        )

    is_technician = _is_role(current_user, TECHNICIAN_ROLE_CODE) and request.get("technician_id") == current_user["sub"]

    if is_admin:
        allowed = (
            new_status in {"CONFIRMED", "ASSIGNED", "CANCELLED"}
            and request["status"] not in {"COMPLETED", "CANCELLED"}
        )
    elif is_customer:
        allowed = (
            (
                request["status"] in {
                    "REQUESTED",
                    "PENDING",
                    "CONFIRMED",
                    "ASSIGNED",
                    "ACCEPTED",
                    "DIAGNOSING",
                    "DIAGNOSED",
                    "ESTIMATE_SUBMITTED",
                    "WAITING_FOR_APPROVAL",
                    "ESTIMATE_REJECTED",
                }
                and new_status == "CANCELLED"
            )
            or (
                request["status"] in {"ESTIMATE_SUBMITTED", "WAITING_FOR_APPROVAL"}
                and new_status in {"ESTIMATE_APPROVED", "ESTIMATE_REJECTED"}
            )
        )
    elif is_technician:
        allowed = new_status in TECHNICIAN_TRANSITIONS.get(request["status"], set())
    else:
        allowed = False

    if not allowed:
        raise AppException(ErrorCode.INVALID_STATUS_TRANSITION)

    if is_technician and new_status in {"ACCEPTED", "EN_ROUTE"}:
        _ensure_technician_not_busy(current_user["sub"], request)

    # Scheduled appointments may be accepted in advance, but travelling only
    # starts inside the 30-minute arrival window. SOS jobs have no window.
    if new_status == "EN_ROUTE" and request.get("status") == "ACCEPTED":
        scheduled_start = _scheduled_start_at(request)
        if scheduled_start is not None:
            now_vn = datetime.now(VN_TZ)
            if now_vn < scheduled_start - timedelta(minutes=30):
                allowed_from = (scheduled_start - timedelta(minutes=30)).strftime("%H:%M")
                raise AppException(
                    ErrorCode.VALIDATION_ERROR,
                    message=f"Chưa đến giờ bắt đầu di chuyển. Bạn có thể bắt đầu từ {allowed_from}.",
                )

    # Mọi đường vào REPAIRING (kể cả ARRIVED/DIAGNOSING) đều cần báo giá khách đã duyệt.
    if new_status == "REPAIRING" and request["status"] != "REPAIRING":
        quotes = repository.get_quotes_by_repair_id(actual_id) or []
        if not any(quote.get("status") == "ACCEPTED" for quote in quotes):
            raise AppException(ErrorCode.QUOTE_NOT_ACCEPTED)

    now = datetime.now(timezone.utc).isoformat()
    # Kỹ thuật viên từ chối nhận việc (REJECTED) hoặc hủy nhận việc (CANCELLED) khi chưa hoàn thành
    if new_status == "REJECTED" or (is_technician and new_status == "CANCELLED" and request.get("status") not in {"COMPLETED", "PAID"}):
        # 1. Thu thập tất cả ID của KTV đã từng xử lý hoặc từ chối đơn này để loại trừ
        excluded_tech_ids = {current_user["sub"]}
        if request.get("technician_id"):
            excluded_tech_ids.add(request["technician_id"])

        history_ok = True
        try:
            excluded_tech_ids |= _declined_technician_ids(actual_id)
        except Exception as h_err:
            history_ok = False
            logger.warning(f"Error fetching history for exclusion: {h_err}")

        # 2. Ghi nhận lịch sử KTV hiện tại từ chối hoặc hủy nhận ca
        action_name = "hủy nhận đơn" if new_status == "CANCELLED" else "từ chối nhận đơn"
        reject_note = payload.get("cancel_reason") or f"Kỹ thuật viên {action_name}"
        repository.add_status_history(
            {
                "id": _request_id(),
                "repair_id": actual_id,
                "status": "REQUESTED",
                "changed_by": current_user["sub"],
                "note": f"[KTV {action_name}] {reject_note}",
            }
        )

        # 3. Tự động tìm KTV tiếp theo khả dụng (nếu là đơn khẩn cấp SOS)
        # Lịch hẹn thường cũng cần tự tìm KTV thay thế khi bị từ chối;
        # không được phụ thuộc vào việc request có GPS hay không.
        is_sos_request = bool(request.get("is_sos")) or _scheduled_start_at(request) is not None or bool(
            request.get("latitude") and request.get("longitude")
        )
        next_tech_id = _find_best_sos_technician(
            customer_lat=request.get("latitude"),
            customer_lng=request.get("longitude"),
            device_type=repository.get_device_type(request.get("device_id")),
            exclude_tech_ids=excluded_tech_ids,
            appointment_start=_scheduled_start_at(request),
        ) if is_sos_request and history_ok else None  # Không rõ ai đã từ chối -> để Admin điều phối.

        from app.notifications import service as notif_service

        if next_tech_id:
            update_data = {
                "status": "ASSIGNED",
                "technician_id": next_tech_id,
                "assigned_at": now,
                "cancelled_at": None,
                "cancel_reason": None,
                "updated_by": current_user["sub"],
            }
            updated_record = repository.update_repair_request(actual_id, update_data)
            repository.add_status_history(
                {
                    "id": _request_id(),
                    "repair_id": actual_id,
                    "status": "ASSIGNED",
                    "changed_by": current_user["sub"],
                    "note": f"Hệ thống tự động tái phân công cho KTV mới sau khi KTV trước {action_name}",
                }
            )
            logger.info(f"Auto-reassigned request {actual_id} from {current_user['sub']} to {next_tech_id}")
            try:
                notif_service.notify_request_assigned(updated_record, next_tech_id)
                notif_service.notify_admins(
                    title=f"KTV {action_name} #{request.get('request_code') or actual_id[:8]}",
                    body=f"KTV đã {action_name} ({reject_note}). Hệ thống đã tự động gán cho KTV mới.",
                    type_code="REQUEST_REASSIGNED",
                    data={"repair_id": actual_id, "url": "/dashboard"},
                )
            except Exception as n_err:
                logger.warning(f"Failed to send notifications on auto-reassign: {n_err}")
        else:
            # Không có KTV khác khả dụng -> Chuyển về REQUESTED chờ Admin điều phối thủ công
            update_data = {
                "status": "REQUESTED",
                "technician_id": None,
                "assigned_at": None,
                "cancelled_at": None,
                "cancel_reason": None,
                "updated_by": current_user["sub"],
            }
            updated_record = repository.update_repair_request(actual_id, update_data)
            repository.add_status_history(
                {
                    "id": _request_id(),
                    "repair_id": actual_id,
                    "status": "REQUESTED",
                    "changed_by": current_user["sub"],
                    "note": f"KTV {action_name}. Đơn chuyển về hàng đợi để Admin điều phối KTV khác.",
                }
            )
            logger.info(f"Request {actual_id} reverted to REQUESTED after technician {action_name}")
            try:
                notif_service.notify_admins(
                    title=f"Cần điều phối: KTV đã {action_name} #{request.get('request_code') or actual_id[:8]}",
                    body=f"KTV đã {action_name} ({reject_note}). Đơn đã chuyển về trạng thái chờ phân công, vui lòng gán thợ khác.",
                    type_code="REQUEST_UNASSIGNED",
                    data={"repair_id": actual_id, "url": "/dashboard"},
                )
                notif_service.notify_status_changed(
                    request_dict=request,
                    new_status="REJECTED",
                    old_status=request.get("status"),
                    note=reject_note,
                )
            except Exception as n_err:
                logger.warning(f"Failed to send notifications on revert to requested: {n_err}")

        # Trả về đối tượng request với quyền admin để tránh lỗi FORBIDDEN do KTV vừa từ chối
        return fetch_request(actual_id, {"sub": current_user["sub"], "role": ADMIN_ROLE_CODE})
    else:
        update_data = {
            "status": new_status,
            "updated_by": current_user["sub"],
        }
        if new_status == "ACCEPTED":
            update_data["accepted_at"] = now
        elif new_status in {"ARRIVED", "EN_ROUTE"}:
            update_data["arrived_at"] = now
        elif new_status in {"DIAGNOSING", "ESTIMATE_SUBMITTED", "WAITING_FOR_APPROVAL"}:
            update_data["diagnosed_at"] = now
        elif new_status == "ESTIMATE_APPROVED":
            try:
                quote_response = _respond_to_pending_quote(request_id, payload, {
                    "status": "ACCEPTED",
                    "replied_by": current_user["sub"],
                    "replied_at": now,
                    "updated_by": current_user["sub"],
                    "updated_at": now,
                })
                if not quote_response or not quote_response.data:
                    raise AppException(ErrorCode.QUOTE_NOT_FOUND)
            except AppException:
                raise
            except Exception as q_err:
                logger.warning(f"Failed to update quote to ACCEPTED: {q_err}")
                raise AppException(ErrorCode.DATABASE_ERROR) from q_err

            try:
                quotes = repository.get_quotes_by_repair_id(request_id) or []
                accepted_quotes = [q for q in quotes if q.get("status") == "ACCEPTED"]
                if accepted_quotes:
                    approved_total = sum(float(q.get("estimated_price") or 0) for q in accepted_quotes)
                    update_data["total_amount"] = approved_total
            except Exception as sum_err:
                logger.warning(f"Failed to sum accepted quotes: {sum_err}")
                raise AppException(ErrorCode.DATABASE_ERROR) from sum_err
        elif new_status == "ESTIMATE_REJECTED":
            reject_reason = payload.get("cancel_reason") or payload.get("reject_reason") or "Không đồng ý"
            try:
                quote_response = _respond_to_pending_quote(request_id, payload, {
                    "status": "REJECTED",
                    "reject_reason": reject_reason,
                    "replied_by": current_user["sub"],
                    "replied_at": now,
                    "updated_by": current_user["sub"],
                    "updated_at": now,
                })
                if not quote_response or not quote_response.data:
                    raise AppException(ErrorCode.QUOTE_NOT_FOUND)
            except AppException:
                raise
            except Exception as q_err:
                logger.warning(f"Failed to update quote to REJECTED: {q_err}")
                raise AppException(ErrorCode.DATABASE_ERROR) from q_err
        elif new_status == "REPAIRING":
            update_data["repairing_at"] = now
        elif new_status == "COMPLETED":
            final_cost = _validated_final_cost(request_id, _submitted_final_cost(payload))
            # Đơn có phí chỉ được hoàn tất sau khi thanh toán đã được xác nhận
            if final_cost > 0:
                payment = _get_payment(request_id)
                if not payment or payment.get("payment_status") != "PAID":
                    raise AppException(
                        ErrorCode.INVALID_STATUS_TRANSITION,
                        message="Khách hàng chưa thanh toán. Đơn chỉ được hoàn tất sau khi khách chuyển khoản hoặc trả tiền mặt và bạn đã xác nhận nhận tiền.",
                    )
                if not math.isclose(float(payment.get("amount") or 0), final_cost, rel_tol=0, abs_tol=0.01):
                    raise AppException(ErrorCode.VALIDATION_ERROR, message="Chi phí thực tế không khớp với số tiền khách đã thanh toán.")
            update_data["total_amount"] = final_cost

            update_data["completed_at"] = request.get("completed_at") or now
        elif new_status == "CANCELLED":
            cancel_msg = payload.get("cancel_reason") or ("Khách hàng hủy đơn đặt lịch" if is_customer else "Yêu cầu đã bị hủy")
            update_data["cancelled_at"] = now
            update_data["cancel_reason"] = cancel_msg

        total_amt = _submitted_final_cost(payload)
        if total_amt is not None and new_status not in {"ESTIMATE_APPROVED", "ESTIMATE_REJECTED"}:
            update_data["total_amount"] = float(total_amt)

        # Tránh race condition khi KTV gửi đồng thời nhiều request nhận đơn.
        update_expected = None
        if is_technician:
            update_expected = {
                "status": request["status"],
                "technician_id": current_user["sub"],
            }
        updated_request = repository.update_repair_request(
            actual_id,
            update_data,
            expected=update_expected,
        )
        if not updated_request:
            if is_technician:
                raise AppException(
                    ErrorCode.INVALID_STATUS_TRANSITION,
                    message="Đơn vừa được cập nhật bởi một thao tác khác. Vui lòng tải lại danh sách đơn.",
                )
            raise AppException(ErrorCode.DATABASE_ERROR)

        if new_status == "COMPLETED" and updated_request.get("technician_id"):
            tech_id = updated_request["technician_id"]
            try:
                from app.db.database import supabase
                c_resp = (
                    supabase.table("repair_requests")
                    .select("id", count="exact")
                    .eq("technician_id", tech_id)
                    .eq("status", "COMPLETED")
                    .execute()
                )
                if c_resp and c_resp.count is not None:
                    supabase.table("technician_profiles").update({"total_jobs_done": c_resp.count}).eq("user_id", tech_id).execute()
            except Exception as t_err:
                logger.warning(f"Failed to update total_jobs_done for tech {tech_id}: {t_err}")

        history_note = payload.get("cancel_reason")
        if not history_note:
            if new_status == "CANCELLED":
                history_note = "Khách hàng hủy đơn đặt lịch" if is_customer else "Yêu cầu đã bị hủy"
            elif new_status == "ACCEPTED":
                history_note = "Kỹ thuật viên chấp nhận yêu cầu"
            elif new_status == "ESTIMATE_APPROVED":
                history_note = "Khách hàng đã phê duyệt báo giá"
            elif new_status == "ESTIMATE_REJECTED":
                history_note = f"Khách hàng từ chối báo giá ({payload.get('reject_reason') or 'Không đồng ý'})"

        repository.add_status_history(
            {
                "id": _request_id(),
                "repair_id": actual_id,
                "status": new_status,
                "changed_by": current_user["sub"],
                "note": history_note,
            }
        )

        try:
            from app.notifications import service as notif_service
            if new_status == "ESTIMATE_APPROVED":
                notif_service.notify_quote_response(updated_request, {}, approved=True)
            elif new_status == "ESTIMATE_REJECTED":
                notif_service.notify_quote_response(updated_request, {}, approved=False, reject_reason=payload.get("reject_reason"))
            else:
                notif_service.notify_status_changed(updated_request, new_status, old_status=request.get("status"), note=history_note)
        except Exception as notif_err:
            logger.warning(f"Failed to trigger notifications for update_request_status: {notif_err}")

        return fetch_request(actual_id, current_user)


def add_after_repair_image(request_id: str, file: UploadFile, current_user: dict):
    file_extension = storage.validate_image_upload(file, max_size=MAX_IMAGE_SIZE_BYTES)


    request = repository.get_repair_request_by_id(request_id)
    if not request:
        raise AppException(ErrorCode.REQUEST_NOT_FOUND)

    is_assigned_technician = (
        _is_role(current_user, TECHNICIAN_ROLE_CODE) and request.get("technician_id") == current_user["sub"]
    )
    if not is_assigned_technician:
        raise AppException(ErrorCode.FORBIDDEN)

    safe_ext = file_extension if file_extension in VALID_IMAGE_EXTENSIONS else "jpg"
    file_name = f"{uuid.uuid4()}.{safe_ext}"
    supabase_path = f"public/after-repair/{request_id}/{file_name}"

    public_url = storage.upload_file_to_supabase(file, supabase_path)

    repository.create_repair_image({
        "id": _image_id(),
        "repair_id": request_id,
        "image_url": public_url,
        "image_type": "AFTER_REPAIR",
        "description": "Ảnh sau khi sửa chữa",
        "created_by": current_user["sub"],
    })

    return fetch_request(request_id, current_user)


def add_diagnostic_image(request_id: str, file: UploadFile, current_user: dict):
    file_extension = storage.validate_image_upload(file, max_size=MAX_IMAGE_SIZE_BYTES)


    request = repository.get_repair_request_by_id(request_id)
    if not request:
        raise AppException(ErrorCode.REQUEST_NOT_FOUND)

    is_authorized = (
        _is_role(current_user, ADMIN_ROLE_CODE)
        or (_is_role(current_user, TECHNICIAN_ROLE_CODE) and request.get("technician_id") == current_user["sub"])
    )
    if not is_authorized:
        raise AppException(ErrorCode.FORBIDDEN)

    safe_ext = file_extension if file_extension in VALID_IMAGE_EXTENSIONS else "jpg"
    file_name = f"{uuid.uuid4()}.{safe_ext}"
    supabase_path = f"public/diagnostic/{request_id}/{file_name}"

    public_url = storage.upload_file_to_supabase(file, supabase_path)

    repository.create_repair_image({
        "id": _image_id(),
        "repair_id": request_id,
        "image_url": public_url,
        "image_type": "BEFORE_REPAIR",
        "description": "Ảnh chẩn đoán sự cố",
        "created_by": current_user["sub"],
    })

    return fetch_request(request_id, current_user)


def add_customer_image(request_id: str, file: UploadFile, current_user: dict):
    file_extension = storage.validate_image_upload(file, max_size=MAX_IMAGE_SIZE_BYTES)


    request = repository.get_repair_request_by_id(request_id)
    if not request:
        raise AppException(ErrorCode.REQUEST_NOT_FOUND)

    is_authorized = (
        _is_role(current_user, ADMIN_ROLE_CODE)
        or request.get("customer_id") == current_user["sub"]
        or request.get("technician_id") == current_user["sub"]
    )
    if not is_authorized:
        raise AppException(ErrorCode.FORBIDDEN)

    safe_ext = file_extension if file_extension in VALID_IMAGE_EXTENSIONS else "jpg"
    file_name = f"{uuid.uuid4()}.{safe_ext}"
    supabase_path = f"public/customer-requests/{request_id}/{file_name}"

    public_url = storage.upload_file_to_supabase(file, supabase_path)

    repository.create_repair_image({
        "id": _image_id(),
        "repair_id": request_id,
        "image_url": public_url,
        "image_type": "BEFORE_REPAIR",
        "description": "Ảnh sự cố từ khách hàng",
        "created_by": current_user["sub"],
    })

    return fetch_request(request_id, current_user)



QUOTE_EDITABLE_STATUSES = {"DIAGNOSING", "ARRIVED", "ESTIMATE_SUBMITTED", "WAITING_FOR_APPROVAL", "ESTIMATE_REJECTED", "ACCEPTED", "REPAIRING"}


def _authorize_quote_author(request_id: str, current_user: dict) -> dict:
    request = repository.get_repair_request_by_id(request_id)
    if not request:
        raise AppException(ErrorCode.REQUEST_NOT_FOUND)

    is_technician = (
        _is_role(current_user, ADMIN_ROLE_CODE)
        or (_is_role(current_user, TECHNICIAN_ROLE_CODE) and request.get("technician_id") == current_user["sub"])
    )
    if not is_technician:
        raise AppException(ErrorCode.FORBIDDEN)

    if request.get("status") not in QUOTE_EDITABLE_STATUSES:
        raise AppException(
            ErrorCode.INVALID_STATUS_TRANSITION,
            message="Yêu cầu không ở trạng thái cho phép tạo báo giá.",
        )
    return request


def _prepare_quote(data: dict, is_supplementary: bool) -> tuple[dict, list[dict]]:
    # Kiểm tra dữ liệu và tính chi phí báo giá.
    from app.core.validation import validated_payload
    from app.repair_requests.schemas import QuoteCreateRequest
    data = validated_payload(QuoteCreateRequest, data)
    items = data.get("items") or []
    diagnosis_note = data.get("diagnosis_note") or ("Báo giá bổ sung / Chi phí phát sinh" if is_supplementary else "Báo giá sửa chữa")
    severity = data.get("severity") or "MINOR"
    if severity not in {"MINOR", "MAJOR"}:
        severity = "MINOR"

    total = 0.0
    computed_parts_cost = 0.0
    computed_labor_fee = 0.0

    parsed_items = []
    for it in items:
        qty = float(it["quantity"])
        price = float(it["price"] if it.get("price") is not None else it["unit_price"])
        subtotal = float(it["subtotal"]) if it.get("subtotal") is not None else qty * price
        if not math.isclose(subtotal, qty * price, rel_tol=0, abs_tol=0.01):
            raise AppException(ErrorCode.VALIDATION_ERROR, message="Thành tiền hạng mục phải bằng số lượng nhân đơn giá.")
        total += subtotal

        name = str(it.get("name") or it.get("item_name") or "Linh kiện").strip()
        raw_type = it.get("item_type")
        if raw_type:
            it_type = str(raw_type).strip().upper()
            if it_type not in ITEM_TYPES:
                raise AppException(ErrorCode.INVALID_ITEM_TYPE)
        else:
            # Fallback an toàn cho client phiên bản cũ chưa gửi item_type
            name_lower = name.lower()
            if any(k in name_lower for k in ["tiền công", "công sửa", "công kỹ thuật", "labor"]):
                it_type = "LABOR"
            else:
                it_type = "SPARE_PART"

        if it_type == "LABOR":
            computed_labor_fee += subtotal
        else:
            computed_parts_cost += subtotal

        parsed_items.append({
            "name": name,
            "quantity": qty,
            "unit_price": price,
            "subtotal": subtotal,
            "item_type": it_type,
        })

    labor_value = data["labor_fee"] if data.get("labor_fee") is not None else data.get("laborCost")
    parts_value = data["parts_cost"] if data.get("parts_cost") is not None else data.get("partsCost")
    labor_fee = float(labor_value) if labor_value is not None else computed_labor_fee
    parts_cost = float(parts_value) if parts_value is not None else computed_parts_cost

    if items and (not math.isclose(labor_fee, computed_labor_fee, rel_tol=0, abs_tol=0.01) or not math.isclose(parts_cost, computed_parts_cost, rel_tol=0, abs_tol=0.01)):
        raise AppException(ErrorCode.VALIDATION_ERROR, message="Tiền công và chi phí linh kiện phải khớp với các hạng mục báo giá.")
    supplied_total = data.get("total_amount") if data.get("total_amount") is not None else data.get("estimated_price")
    calculated_total = labor_fee + parts_cost
    if supplied_total is not None and (items or labor_value is not None or parts_value is not None) and not math.isclose(float(supplied_total), calculated_total, rel_tol=0, abs_tol=0.01):
        raise AppException(ErrorCode.VALIDATION_ERROR, message="Tổng báo giá phải khớp với chi phí các hạng mục. Báo giá bổ sung chỉ gồm chi phí phát sinh.")
    total = float(supplied_total) if supplied_total is not None else calculated_total

    fields = {
        "diagnosis_note": diagnosis_note,
        "severity": severity,
        "labor_fee": labor_fee,
        "parts_cost": parts_cost,
        "estimated_price": total,
    }
    return fields, parsed_items


def _save_quote_items(quote_id: str, parsed_items: list[dict]) -> list[dict]:
    created_items = []
    for p_it in parsed_items:
        item_id = secrets.token_hex(5).upper()[:10]
        item_rec = {
            "id": item_id,
            "quote_id": quote_id,
            "item_name": p_it["name"][:200],
            "item_type": p_it["item_type"],
            "quantity": p_it["quantity"],
            "unit_price": p_it["unit_price"],
            "subtotal": p_it["subtotal"],
        }
        ci = repository.create_quote_item(item_rec)
        if ci:
            created_items.append(ci)
        else:
            created_items.append(item_rec)
    return created_items


def create_quote_for_request(request_id: str, data: dict, current_user: dict):
    request = _authorize_quote_author(request_id, current_user)

    previous_quotes = repository.get_quotes_by_repair_id(request_id) or []
    if any(quote.get("status") == "PENDING" for quote in previous_quotes):
        raise AppException(ErrorCode.QUOTE_ALREADY_EXISTS, message="Đã có báo giá đang chờ khách hàng duyệt. Vui lòng sửa báo giá đó thay vì tạo mới.")
    accepted_quotes = [quote for quote in previous_quotes if quote.get("status") == "ACCEPTED"]
    is_supplementary = bool(accepted_quotes)
    fields, parsed_items = _prepare_quote(data, is_supplementary)
    total = fields["estimated_price"]

    quote_id = secrets.token_hex(5).upper()[:10]
    quote_record = {
        "id": quote_id,
        "repair_id": request_id,
        **fields,
        "status": "PENDING",
        "created_by": current_user["sub"],
        "updated_by": current_user["sub"],
    }
    created_quote = repository.create_quote(quote_record)
    created_items = _save_quote_items(quote_id, parsed_items)

    try:
        now_iso = datetime.now(timezone.utc).isoformat()
        update_fields = {
            "status": "WAITING_FOR_APPROVAL",
            "diagnosed_at": now_iso,
            "updated_by": current_user["sub"],
        }
        update_fields["total_amount"] = (
            sum(float(quote.get("estimated_price") or 0) for quote in accepted_quotes)
            if is_supplementary else total
        )

        updated_request = repository.update_repair_request(request_id, update_fields)
        if not updated_request:
            raise AppException(ErrorCode.DATABASE_ERROR)
        note_msg = (
            f"Kỹ thuật viên đã tạo báo giá bổ sung (Phát sinh: {total:,.0f} đ), chờ khách hàng duyệt"
            if is_supplementary
            else f"Kỹ thuật viên đã lập báo giá (Tổng: {total:,.0f} đ), chờ khách hàng duyệt"
        )
        repository.add_status_history({
            "id": _request_id(),
            "repair_id": request_id,
            "status": "WAITING_FOR_APPROVAL",
            "changed_by": current_user["sub"],
            "note": note_msg,
        })
    except Exception as stat_err:
        logger.warning(f"Failed to update repair status on quote create: {stat_err}")
        raise AppException(ErrorCode.DATABASE_ERROR) from stat_err

    result_quote = created_quote or {
        "id": quote_id,
        "repair_id": request_id,
        **fields,
        "status": "PENDING",
        "items": created_items
    }

    try:
        from app.notifications import service as notif_service
        notif_service.notify_quote_submitted(request, result_quote)
    except Exception as notif_err:
        logger.warning(f"Failed to trigger notify_quote_submitted: {notif_err}")

    if created_quote:
        created_quote["items"] = created_items
    return result_quote


def update_quote_for_request(request_id: str, quote_id: str, data: dict, current_user: dict):
    # KTV sửa báo giá đang chờ duyệt.
    _authorize_quote_author(request_id, current_user)

    quotes = repository.get_quotes_by_repair_id(request_id) or []
    quote = next((q for q in quotes if q.get("id") == quote_id), None)
    if not quote:
        raise AppException(ErrorCode.QUOTE_NOT_FOUND)
    if quote.get("status") != "PENDING":
        raise AppException(ErrorCode.QUOTE_ALREADY_DECIDED, message="Khách hàng đã phản hồi báo giá này nên không thể sửa. Vui lòng tạo báo giá mới.")

    accepted_quotes = [q for q in quotes if q.get("status") == "ACCEPTED"]
    is_supplementary = bool(accepted_quotes)
    fields, parsed_items = _prepare_quote(data, is_supplementary)
    total = fields["estimated_price"]

    now_iso = datetime.now(timezone.utc).isoformat()
    updated_quote = repository.update_pending_quote(quote_id, {
        **fields,
        "updated_by": current_user["sub"],
        "updated_at": now_iso,
    })
    if not updated_quote:
        raise AppException(ErrorCode.QUOTE_ALREADY_DECIDED, message="Khách hàng vừa phản hồi báo giá này nên không thể sửa. Vui lòng tải lại đơn.")

    # Thêm hạng mục mới trước rồi mới xóa hạng mục cũ để không mất dữ liệu nếu ghi lỗi giữa chừng
    old_item_ids = [item["id"] for item in repository.get_quote_items(quote_id) or [] if item.get("id")]
    created_items = _save_quote_items(quote_id, parsed_items)
    repository.delete_quote_items_by_ids(old_item_ids)

    try:
        repository.add_quote_history({
            "id": secrets.token_hex(5).upper()[:10],
            "quote_id": quote_id,
            "action": "UPDATED",
            "old_data": {key: quote.get(key) for key in ("labor_fee", "parts_cost", "estimated_price", "diagnosis_note")},
            "new_data": fields,
            "changed_by": current_user["sub"],
        })
    except Exception as history_err:
        logger.warning(f"Failed to write quote history: {history_err}")

    update_fields = {"updated_by": current_user["sub"]}
    if not is_supplementary:
        update_fields["total_amount"] = total
    if not repository.update_repair_request(request_id, update_fields):
        raise AppException(ErrorCode.DATABASE_ERROR)

    label = "chi phí phát sinh" if is_supplementary else "báo giá"
    old_total = float(quote.get("estimated_price") or 0)
    repository.add_status_history({
        "id": _request_id(),
        "repair_id": request_id,
        "status": "WAITING_FOR_APPROVAL",
        "changed_by": current_user["sub"],
        "note": f"Kỹ thuật viên đã cập nhật {label} ({old_total:,.0f} đ → {total:,.0f} đ), chờ khách hàng duyệt",
    })

    updated_quote["items"] = created_items
    return updated_quote


def fetch_quotes_for_request(request_id: str, current_user: dict):
    req = repository.get_repair_request_by_id(request_id)
    if not req:
        raise AppException(ErrorCode.REQUEST_NOT_FOUND)
    can_view = (
        _is_role(current_user, ADMIN_ROLE_CODE)
        or (_is_role(current_user, CUSTOMER_ROLE_CODE) and req.get("customer_id") == current_user["sub"])
        or (_is_role(current_user, TECHNICIAN_ROLE_CODE) and req.get("technician_id") == current_user["sub"])
    )
    if not can_view:
        raise AppException(ErrorCode.FORBIDDEN)
    actual_id = req["id"]
    try:
        quotes = repository.get_quotes_by_repair_id(actual_id) or []
        for q in quotes:
            items = repository.get_quote_items(q["id"]) or []
            q["items"] = items
        return quotes
    except Exception as q_err:
        logger.warning(f"Failed to fetch quotes: {q_err}")
        return []


def submit_technician_rating(request_id: str, data: dict, current_user: dict):
    req = repository.get_repair_request_by_id(request_id)
    if not req:
        raise AppException(ErrorCode.REQUEST_NOT_FOUND)

    if current_user.get("sub") != req.get("customer_id"):
        raise AppException(ErrorCode.FORBIDDEN)
    if req.get("status") != "COMPLETED" or not req.get("technician_id"):
        raise AppException(ErrorCode.INVALID_STATUS_TRANSITION, message="Chỉ có thể đánh giá kỹ thuật viên sau khi đơn hoàn thành.")

    rating = data.get("rating", 5)
    if not isinstance(rating, (int, float)) or rating < 1 or rating > 5:
        raise AppException(ErrorCode.INVALID_RATING_VALUE)

    tech_id = req.get("technician_id")
    try:
        saved = repository.save_review({
            "repair_id": req["id"], "customer_id": current_user["sub"],
            "technician_id": tech_id, "rating": int(rating),
            "comment": data.get("comment") or "", "updated_by": current_user["sub"],
        })
        if not saved:
            raise AppException(ErrorCode.DATABASE_ERROR)
        invalidate_technician_cache(tech_id)
    except AppException:
        raise
    except Exception as error:
        logger.warning("Failed to save technician review: %s", error)
        raise AppException(ErrorCode.DATABASE_ERROR) from error

    try:
        from app.notifications import service as notif_service
        notif_service.notify_review_received(request_id, tech_id, rating, data.get("comment"))
    except Exception as notif_err:
        logger.warning(f"Failed to trigger review notification: {notif_err}")

    return {
        "success": True,
        "message": "Đánh giá kỹ thuật viên thành công",
        "rating": int(rating),
        "technician_id": tech_id,
    }

