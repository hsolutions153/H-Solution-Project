import secrets
import uuid
import logging
from collections import defaultdict
from datetime import datetime, time, timedelta, timezone

logger = logging.getLogger(__name__)

VN_TZ = timezone(timedelta(hours=7))

from fastapi import UploadFile

from app.auth import repository as auth_repository
from app.core import storage
from app.core.exceptions import AppException, ErrorCode
from app.customers.models import ADMIN_ROLE_CODE, CUSTOMER_ROLE_CODE
from app.repair_requests import repository
from app.repair_requests.models import (
    ISSUE_TYPES,
    REPAIR_REQUESTS_TABLE,
    REQUEST_STATUSES,
    TECHNICIAN_ROLE_CODE,
    TECHNICIAN_TRANSITIONS,
)

MAX_IMAGE_SIZE_MB = 50
MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024
ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"]


def _payload(data):
    if isinstance(data, dict):
        return data
    if hasattr(data, "model_dump"):
        return data.model_dump(mode="json")
    if hasattr(data, "dict"):
        return data.dict()
    return dict(data)


def _role_id(code: str) -> str:
    role = auth_repository.get_role_by_code(code)
    if not role:
        raise AppException(ErrorCode.ROLE_NOT_CONFIGURED)
    return role["id"]


def _is_role(current_user: dict, code: str) -> bool:
    if current_user.get("role") == code:
        return True
    try:
        return current_user.get("role_id") == _role_id(code)
    except Exception:
        return False


def _request_id() -> str:
    return secrets.token_hex(5).upper()


def _image_id() -> str:
    return secrets.token_hex(5).upper()


def _attach_images_to_list(items: list[dict]) -> list[dict]:
    if not items:
        return []
    from app.db.database import supabase
    from app.auth import repository as auth_repo

    repair_ids = [item["id"] for item in items]
    images = repository.get_repair_images_by_repair_ids(repair_ids)

    images_by_repair = defaultdict(list)
    for img in images:
        images_by_repair[img["repair_id"]].append(img)

    customer_ids = {item["customer_id"] for item in items if item.get("customer_id")}
    device_ids = {item["device_id"] for item in items if item.get("device_id")}

    customers_map = {}
    if customer_ids:
        try:
            users_resp = supabase.table("users").select("id,full_name,phone,email,address").in_("id", list(customer_ids)).execute()
            if users_resp and users_resp.data:
                customers_map = {u["id"]: u for u in users_resp.data}
        except Exception:
            pass

        for cid in customer_ids:
            if cid not in customers_map:
                u = auth_repo.get_user_by_id(cid)
                if u:
                    customers_map[cid] = u

    devices_map = {}
    if device_ids:
        try:
            devices_resp = supabase.table("customer_devices").select("id,device_type,manufacturer,model_name").in_("id", list(device_ids)).execute()
            if devices_resp and devices_resp.data:
                devices_map = {d["id"]: d for d in devices_resp.data}
        except Exception:
            pass

    technician_ids = {item["technician_id"] for item in items if item.get("technician_id")}
    techs_map = {}
    if technician_ids:
        try:
            for tid in technician_ids:
                tu = auth_repo.get_user_by_id(tid)
                tp = repository.get_technician_profile(tid)
                if tu:
                    techs_map[tid] = {
                        "id": tu["id"],
                        "name": tu.get("full_name") or "Kỹ thuật viên",
                        "phone": tu.get("phone") or "0912 345 678",
                        "avatar": tu.get("avatar_url") or "/images/s1.jpg",
                        "specialization": (tp and tp.get("specialization")) or "Chuyên gia bảo trì xe lăn điện",
                        "rating": (tp and tp.get("rating_avg")) or 4.9,
                        "reviews": (tp and tp.get("total_jobs_done")) or 25,
                        "experience_years": (tp and tp.get("experience_years")) or 3,
                        "verified": True,
                    }
        except Exception:
            pass

    quotes_map = {}
    if repair_ids:
        try:
            quotes_resp = supabase.table("repair_quotes").select("id,repair_id,estimated_price,parts_cost,labor_fee,status,diagnosis_note,created_at").in_("repair_id", repair_ids).order("created_at", desc=True).execute()
            if quotes_resp and quotes_resp.data:
                for q in quotes_resp.data:
                    rid = q.get("repair_id")
                    if rid and rid not in quotes_map:
                        quotes_map[rid] = q
        except Exception:
            pass

    for item in items:
        item["images"] = images_by_repair.get(item["id"], [])
        if item.get("customer_id"):
            item["customer"] = customers_map.get(item["customer_id"])
        if item.get("device_id"):
            item["device"] = devices_map.get(item["device_id"])
        if item.get("technician_id"):
            item["technician"] = techs_map.get(item["technician_id"])

        q = quotes_map.get(item["id"])
        if q:
            item["quote"] = q
            if (item.get("total_amount") is None or float(item.get("total_amount") or 0) == 0) and q.get("estimated_price"):
                item["total_amount"] = float(q["estimated_price"])

    return items


def _list(customer_id: str | None, technician_id: str | None, request_status: str | None, page: int, limit: int):
    if request_status and request_status not in REQUEST_STATUSES:
        raise AppException(ErrorCode.VALIDATION_ERROR, message="Trạng thái yêu cầu không hợp lệ")

    try:
        reassign_timed_out_requests(timeout_seconds=120)
    except Exception:
        pass

    items, total = repository.get_repair_requests(
        customer_id=customer_id,
        technician_id=technician_id,
        request_status=request_status,
        page=page,
        limit=limit,
    )
    return {"items": _attach_images_to_list(items), "total": total, "page": page, "limit": limit}


def _find_best_sos_technician(customer_lat=None, customer_lng=None, exclude_tech_ids=None):
    from app.db.database import supabase
    import math

    excluded = set(exclude_tech_ids or [])

    try:
        resp = supabase.table("technician_profiles").select("*").eq("is_online", True).execute()
        techs = resp.data if resp and resp.data else []

        if not techs:
            resp = supabase.table("technician_profiles").select("*").execute()
            techs = resp.data if resp and resp.data else []

        if not techs:
            return None

        # Filter out previously rejected/assigned technician IDs
        techs = [t for t in techs if t.get("user_id") not in excluded]
        if not techs:
            logger.info(f"No available technicians found excluding: {excluded}")
            return None

        # Query active jobs count per technician to prioritize IDLE (rảnh) technicians
        active_statuses = [
            "ASSIGNED", "ACCEPTED", "EN_ROUTE", "ARRIVED",
            "DIAGNOSING", "ESTIMATE_SUBMITTED", "ESTIMATE_APPROVED", "REPAIRING"
        ]
        job_counts = {}
        try:
            active_jobs_resp = supabase.table("repair_requests").select("technician_id").in_("status", active_statuses).execute()
            if active_jobs_resp and active_jobs_resp.data:
                for job in active_jobs_resp.data:
                    tid = job.get("technician_id")
                    if tid:
                        job_counts[tid] = job_counts.get(tid, 0) + 1
        except Exception as j_err:
            logger.warning(f"Failed to fetch active jobs count: {j_err}")

        # Multi-tier priority sorting:
        # Priority 1: Fewest active jobs (0 active jobs = IDLE/RẢNH = Highest priority)
        # Priority 2: Nearest distance (if customer coordinates are available)
        # Priority 3: Highest rating average
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
                        dist = math.sqrt((float(t_lat) - c_lat) ** 2 + (float(t_lng) - c_lng) ** 2)
                    except Exception:
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


def reassign_timed_out_requests(timeout_seconds: int = 120) -> int:
    """Tự động tìm và tái phân công KTV mới cho các đơn hàng ASSIGNED quá timeout_seconds (mặc định 2 phút) mà KTV chưa ACCEPTED."""
    from app.db.database import supabase
    from datetime import timedelta

    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(seconds=timeout_seconds)

    try:
        resp = (
            supabase.table(REPAIR_REQUESTS_TABLE)
            .select("*")
            .eq("status", "ASSIGNED")
            .execute()
        )
        assigned_requests = resp.data if resp and resp.data else []
    except Exception as err:
        logger.warning(f"Error querying ASSIGNED requests for timeout check: {err}")
        return 0

    reassigned_count = 0

    for req in assigned_requests:
        # Chỉ áp dụng auto timeout 2 phút cho đơn cứu hộ khẩn cấp (SOS)
        if not req.get("is_sos"):
            continue

        raw_ts = req.get("assigned_at") or req.get("updated_at") or req.get("created_at")
        if not raw_ts:
            continue

        try:
            if isinstance(raw_ts, str):
                ts_clean = raw_ts.replace("Z", "+00:00")
                assigned_dt = datetime.fromisoformat(ts_clean)
                if assigned_dt.tzinfo is None:
                    assigned_dt = assigned_dt.replace(tzinfo=timezone.utc)
            else:
                assigned_dt = raw_ts
        except Exception:
            continue

        if assigned_dt < cutoff:
            req_id = req["id"]
            current_tech_id = req.get("technician_id")
            excluded_tech_ids = set()
            if current_tech_id:
                excluded_tech_ids.add(current_tech_id)

            try:
                histories = repository.get_status_history(req_id)
                for h in histories:
                    if h.get("changed_by") and h.get("status") in {"REJECTED", "ASSIGNED"}:
                        excluded_tech_ids.add(h["changed_by"])
            except Exception:
                pass

            next_tech_id = _find_best_sos_technician(
                customer_lat=req.get("latitude"),
                customer_lng=req.get("longitude"),
                exclude_tech_ids=excluded_tech_ids,
            )

            now_iso = now.isoformat()
            changed_user_id = current_tech_id or req.get("customer_id")
            if next_tech_id:
                update_data = {
                    "technician_id": next_tech_id,
                    "status": "ASSIGNED",
                    "assigned_at": now_iso,
                    "updated_by": changed_user_id,
                }
                repository.update_repair_request(req_id, update_data)
                repository.add_status_history({
                    "id": _request_id(),
                    "repair_id": req_id,
                    "status": "ASSIGNED",
                    "changed_by": changed_user_id,
                    "note": f"KTV trước quá {timeout_seconds // 60} phút không phản hồi. Hệ thống tự động chuyển sang KTV mới: {next_tech_id}",
                })
                logger.info(f"Auto-reassigned timed out request {req_id} from {current_tech_id} to {next_tech_id}")
            else:
                update_data = {
                    "technician_id": None,
                    "status": "REQUESTED",
                    "updated_by": changed_user_id,
                }
                repository.update_repair_request(req_id, update_data)
                repository.add_status_history({
                    "id": _request_id(),
                    "repair_id": req_id,
                    "status": "REQUESTED",
                    "changed_by": changed_user_id,
                    "note": f"KTV trước quá {timeout_seconds // 60} phút không phản hồi, hiện hết KTV khả dụng khác (chuyển sang chờ Admin điều phối)",
                })
                logger.info(f"Timed out request {req_id} reverted to REQUESTED (no other techs available)")

            reassigned_count += 1

    return reassigned_count


def _validate_booking_schedule(booking_date: str | None, booking_slot: str | None):
    if not booking_date:
        return

    now_vn = datetime.now(VN_TZ)
    date_map = {
        "TODAY": now_vn.date(),
        "TOMORROW": now_vn.date() + timedelta(days=1),
    }
    try:
        booking_day = date_map.get(booking_date) or datetime.strptime(booking_date, "%Y-%m-%d").date()
    except ValueError:
        # Unrecognized format: leave it to be stored as a free-text note, not our job to block it here.
        return

    slot_time = None
    if booking_slot:
        try:
            slot_time = datetime.strptime(booking_slot, "%H:%M").time()
        except ValueError:
            slot_time = None

    # Without a specific slot, only reject when the whole day has already passed.
    scheduled_at = datetime.combine(booking_day, slot_time or time(23, 59), tzinfo=VN_TZ)
    if scheduled_at < now_vn:
        raise AppException(
            ErrorCode.VALIDATION_ERROR,
            message="Thời gian đặt lịch đã ở trong quá khứ, vui lòng chọn lại ngày/giờ khác",
        )


def create_request(current_user: dict, data):
    if not _is_role(current_user, CUSTOMER_ROLE_CODE):
        raise AppException(ErrorCode.FORBIDDEN)
    payload = _payload(data)

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

    device_id = payload.get("device_id")
    if not device_id or not repository.get_device_for_customer(device_id, current_user["sub"]):
        existing_device_id = repository.get_any_device_for_customer(current_user["sub"])
        if existing_device_id:
            device_id = existing_device_id
        else:
            device_id = repository.create_default_device_for_customer(current_user["sub"])

    description = payload.get("description") or payload.get("issue_description") or ""
    address = payload.get("address_detail") or payload.get("location_address") or ""
    lat = payload.get("location_lat") or payload.get("latitude")
    lng = payload.get("location_lng") or payload.get("longitude")

    booking_date = payload.get("booking_date") or payload.get("appointment_date")
    booking_slot = payload.get("booking_slot") or payload.get("appointment_slot")
    _validate_booking_schedule(booking_date, booking_slot)
    if booking_date or booking_slot:
        date_str = "Hôm nay" if booking_date == "TODAY" else ("Ngày mai" if booking_date == "TOMORROW" else (booking_date or ""))
        slot_str = booking_slot or ""
        sched_note = f"[Hẹn: {date_str} {slot_str}]".strip()
        if sched_note and sched_note not in description:
            description = f"{description} | {sched_note}".strip() if description else sched_note
    
    is_sos = payload.get("is_sos", False)
    if payload.get("request_type") in ["SOS", "EMERGENCY"]:
        is_sos = True

    images = payload.get("image_urls") or payload.get("inspection_images") or payload.get("images") or []

    # Limit address to fit VARCHAR(255) column constraint
    address = (address or "Địa chỉ chưa xác định")[:250]

    request_id = _request_id()
    tech_id = None
    initial_status = "REQUESTED"

    # Auto-assign available technician for emergency SOS requests
    if is_sos:
        tech_id = _find_best_sos_technician(lat, lng)
        if tech_id:
            initial_status = "ASSIGNED"

    record = {
        "id": request_id,
        "request_code": _request_id(),
        "customer_id": current_user["sub"],
        "technician_id": tech_id,
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
    created = repository.create_repair_request(record)
    if not created:
        raise AppException(ErrorCode.INTERNAL_SERVER_ERROR)

    for idx, img_url in enumerate(images):
        if not img_url:
            continue
        clean_url = str(img_url).strip()
        if clean_url.startswith("blob:") or clean_url.startswith("data:"):
            sample_imgs = ["/images/s1.jpg", "/images/s2.jpg", "/images/s3.jpg"]
            clean_url = sample_imgs[idx % len(sample_imgs)]
        elif len(clean_url) > 480:
            clean_url = clean_url[:480]

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

    return fetch_request(request_id, current_user)


def fetch_my_requests(current_user: dict, request_status: str | None, page: int, limit: int):
    if not _is_role(current_user, CUSTOMER_ROLE_CODE):
        raise AppException(ErrorCode.FORBIDDEN)
    return _list(current_user["sub"], None, request_status, page, limit)


def fetch_technician_requests(current_user: dict, request_status: str | None, page: int, limit: int):
    if not _is_role(current_user, TECHNICIAN_ROLE_CODE):
        raise AppException(ErrorCode.FORBIDDEN)
    return _list(None, current_user["sub"], request_status, page, limit)


def fetch_all_requests(current_user: dict, request_status: str | None, customer_id: str | None, technician_id: str | None, page: int, limit: int):
    if not _is_role(current_user, ADMIN_ROLE_CODE):
        raise AppException(ErrorCode.FORBIDDEN)
    return _list(customer_id, technician_id, request_status, page, limit)


def fetch_request(request_id: str, current_user: dict):
    request = repository.get_repair_request_by_id(request_id)
    if not request:
        raise AppException(ErrorCode.REQUEST_NOT_FOUND)
    can_view = (
        _is_role(current_user, ADMIN_ROLE_CODE)
        or (_is_role(current_user, CUSTOMER_ROLE_CODE) and request["customer_id"] == current_user["sub"])
        or (_is_role(current_user, TECHNICIAN_ROLE_CODE))
    )
    if not can_view:
        raise AppException(ErrorCode.FORBIDDEN)

    images = repository.get_repair_images(request_id)
    request_data = dict(request)
    request_data["images"] = images

    if request.get("customer_id"):
        u = auth_repository.get_user_by_id(request["customer_id"])
        if u:
            request_data["customer"] = u
    if request.get("technician_id"):
        try:
            tu = auth_repository.get_user_by_id(request["technician_id"])
            tp = repository.get_technician_profile(request["technician_id"])
            if tu:
                request_data["technician"] = {
                    "id": tu["id"],
                    "name": tu.get("full_name") or "Kỹ thuật viên",
                    "phone": tu.get("phone") or "0912 345 678",
                    "avatar": tu.get("avatar_url") or "/images/s1.jpg",
                    "specialization": (tp and tp.get("specialization")) or "Chuyên gia bảo trì xe lăn điện",
                    "rating": (tp and tp.get("rating_avg")) or 4.9,
                    "reviews": (tp and tp.get("total_jobs_done")) or 25,
                    "experience_years": (tp and tp.get("experience_years")) or 3,
                    "verified": True,
                }
        except Exception as t_err:
            logger.warning(f"Failed to load technician info in fetch_request: {t_err}")
    if request.get("device_id"):
        try:
            d_resp = supabase.table("customer_devices").select("id,device_type,manufacturer,model_name").eq("id", request["device_id"]).maybe_single().execute()
            if d_resp and d_resp.data:
                request_data["device"] = d_resp.data
        except Exception:
            pass

    try:
        quotes = repository.get_quotes_by_repair_id(request_id)
        if quotes:
            for q in quotes:
                items = repository.get_quote_items(q["id"])
                q["items"] = items or []
            latest_quote = quotes[0]
            request_data["quote"] = latest_quote
            request_data["quotes"] = quotes
            if (request_data.get("total_amount") is None or float(request_data.get("total_amount") or 0) == 0) and latest_quote.get("estimated_price"):
                request_data["total_amount"] = float(latest_quote["estimated_price"])
    except Exception as q_err:
        logger.warning(f"Failed to load quotes in fetch_request: {q_err}")

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
                "avatar": (tech_profile.get("certificate_img") or tech_profile.get("id_card_front") or "") if tech_profile else "",
                "rating": float(tech_profile.get("rating_avg", 5.0)) if tech_profile else 5.0,
            }

    return {
        "request_id": request["id"],
        "current_status": request["status"],
        "technician_info": technician_info,
        "last_updated": request.get("updated_at") or request.get("created_at"),
    }


def update_request_status(request_id: str, current_user: dict, data):
    request = repository.get_repair_request_by_id(request_id)
    if not request:
        raise AppException(ErrorCode.REQUEST_NOT_FOUND)
    payload = _payload(data)
    new_status = (payload.get("status") or "").upper()
    if new_status not in REQUEST_STATUSES:
        raise AppException(ErrorCode.VALIDATION_ERROR, message="Trạng thái yêu cầu không hợp lệ")

    is_admin = _is_role(current_user, ADMIN_ROLE_CODE)
    is_customer = _is_role(current_user, CUSTOMER_ROLE_CODE) and request["customer_id"] == current_user["sub"]

    # Nếu trạng thái không thay đổi, coi như thành công ngay lập tức (Idempotent)
    if new_status == request["status"]:
        return fetch_request(request_id, current_user)

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
            (request["status"] in {"REQUESTED", "CONFIRMED", "ASSIGNED"} and new_status == "CANCELLED")
            or (request["status"] in {"ESTIMATE_SUBMITTED", "WAITING_FOR_APPROVAL"} and new_status in {"ESTIMATE_APPROVED", "ESTIMATE_REJECTED", "CANCELLED"})
        )
    elif is_technician:
        allowed = new_status in TECHNICIAN_TRANSITIONS.get(request["status"], set())
    else:
        allowed = False

    if not allowed:
        raise AppException(ErrorCode.INVALID_STATUS_TRANSITION)

    now = datetime.now(timezone.utc).isoformat()
    if new_status == "REJECTED":
        # 1. Thu thập tất cả ID của KTV đã từng xử lý hoặc từ chối đơn này để loại trừ
        excluded_tech_ids = {current_user["sub"]}
        if request.get("technician_id"):
            excluded_tech_ids.add(request["technician_id"])

        try:
            histories = repository.get_status_history(request_id)
            for h in histories:
                if h.get("changed_by") and h.get("status") in {"REJECTED", "ASSIGNED"}:
                    excluded_tech_ids.add(h["changed_by"])
        except Exception as h_err:
            logger.warning(f"Error fetching history for exclusion: {h_err}")

        # 2. Ghi nhận lịch sử KTV hiện tại từ chối
        reject_note = payload.get("cancel_reason") or "Kỹ thuật viên từ chối nhận đơn"
        repository.add_status_history(
            {
                "id": _request_id(),
                "repair_id": request_id,
                "status": "REQUESTED",
                "changed_by": current_user["sub"],
                "note": f"[KTV từ chối] {reject_note}",
            }
        )

        # 3. Tự động tìm KTV tiếp theo khả dụng và không trùng với KTV trước
        next_tech_id = _find_best_sos_technician(
            customer_lat=request.get("latitude"),
            customer_lng=request.get("longitude"),
            exclude_tech_ids=excluded_tech_ids,
        )

        if next_tech_id:
            update_data = {
                "status": "ASSIGNED",
                "technician_id": next_tech_id,
                "assigned_at": now,
                "updated_by": current_user["sub"],
            }
            repository.update_repair_request(request_id, update_data)
            repository.add_status_history(
                {
                    "id": _request_id(),
                    "repair_id": request_id,
                    "status": "ASSIGNED",
                    "changed_by": current_user["sub"],
                    "note": f"Hệ thống tự động tái phân công cho KTV mới ({next_tech_id}) sau khi KTV trước từ chối",
                }
            )
            logger.info(f"Auto-reassigned request {request_id} from {current_user['sub']} to {next_tech_id}")
        else:
            # Không còn KTV nào khác -> Chuyển về REQUESTED chờ điều phối thủ công
            update_data = {
                "status": "REQUESTED",
                "technician_id": None,
                "updated_by": current_user["sub"],
            }
            repository.update_repair_request(request_id, update_data)
            repository.add_status_history(
                {
                    "id": _request_id(),
                    "repair_id": request_id,
                    "status": "REQUESTED",
                    "changed_by": current_user["sub"],
                    "note": "Hiện không có KTV khả dụng khác, đơn chuyển về hàng đợi chờ Admin điều phối",
                }
            )
            logger.info(f"No available replacement technician for request {request_id}")

        return fetch_request(request_id, current_user)
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
        elif new_status == "REPAIRING":
            update_data["repairing_at"] = now
        elif new_status == "COMPLETED":
            total_amt = payload.get("total_amount") if payload.get("total_amount") is not None else payload.get("totalCost")
            try:
                quotes = repository.get_quotes_by_repair_id(request_id)
                if quotes:
                    latest_quote = quotes[0]
                    est_price = float(latest_quote.get("estimated_price") or 0)
                    final_cost = float(total_amt) if total_amt is not None else float(request.get("total_amount") or 0)
                    if est_price > 0 and final_cost > est_price:
                        raise AppException(
                            ErrorCode.VALIDATION_ERROR,
                            message=f"Chi phí thực tế ({final_cost:,.0f} đ) vượt quá báo giá ban đầu ({est_price:,.0f} đ). Vui lòng xác nhận trước khi hoàn tất.",
                        )
            except AppException:
                raise
            except Exception as check_err:
                logger.warning(f"Error checking quote vs final cost: {check_err}")

            update_data["completed_at"] = now
        elif new_status == "CANCELLED":
            update_data["cancelled_at"] = now
            update_data["cancel_reason"] = payload.get("cancel_reason")

        total_amt = payload.get("total_amount") if payload.get("total_amount") is not None else payload.get("totalCost")
        if total_amt is not None:
            update_data["total_amount"] = float(total_amt)

        repository.update_repair_request(request_id, update_data)
        repository.add_status_history(
            {
                "id": _request_id(),
                "repair_id": request_id,
                "status": new_status,
                "changed_by": current_user["sub"],
                "note": payload.get("cancel_reason") or ("Kỹ thuật viên chấp nhận yêu cầu" if new_status == "ACCEPTED" else None),
            }
        )
        return fetch_request(request_id, current_user)


def add_after_repair_image(request_id: str, file: UploadFile, current_user: dict):
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise AppException(ErrorCode.IMAGE_TYPE_UNSUPPORTED)

    file.file.seek(0, 2)
    file_size = file.file.tell()
    file.file.seek(0)
    if file_size > MAX_IMAGE_SIZE_BYTES:
        raise AppException(ErrorCode.IMAGE_SIZE_TOO_LARGE)

    request = repository.get_repair_request_by_id(request_id)
    if not request:
        raise AppException(ErrorCode.REQUEST_NOT_FOUND)

    is_assigned_technician = (
        _is_role(current_user, TECHNICIAN_ROLE_CODE) and request.get("technician_id") == current_user["sub"]
    )
    if not is_assigned_technician:
        raise AppException(ErrorCode.FORBIDDEN)

    file_extension = file.filename.split('.')[-1] if '.' in file.filename else 'jpg'
    file_name = f"{uuid.uuid4()}.{file_extension}"
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


def create_quote_for_request(request_id: str, data: dict, current_user: dict):
    request = repository.get_repair_request_by_id(request_id)
    if not request:
        raise AppException(ErrorCode.REQUEST_NOT_FOUND)

    is_technician = (
        _is_role(current_user, ADMIN_ROLE_CODE)
        or _is_role(current_user, TECHNICIAN_ROLE_CODE)
    )
    if not is_technician:
        raise AppException(ErrorCode.FORBIDDEN)

    if request.get("status") not in {"DIAGNOSING", "ARRIVED", "ESTIMATE_SUBMITTED", "WAITING_FOR_APPROVAL", "ACCEPTED"}:
        raise AppException(
            ErrorCode.INVALID_STATUS_TRANSITION,
            message="Yêu cầu phải ở trạng thái Đang chẩn đoán (DIAGNOSING) để tạo báo giá.",
        )

    items = data.get("items") or []
    diagnosis_note = data.get("diagnosis_note") or "Báo giá sửa chữa"
    severity = data.get("severity") or "MINOR"
    if severity not in {"MINOR", "MAJOR"}:
        severity = "MINOR"

    total = 0.0
    computed_parts_cost = 0.0
    computed_labor_fee = 0.0

    for it in items:
        qty = float(it.get("quantity") or 1)
        price = float(it.get("price") or it.get("unit_price") or 0)
        subtotal = qty * price
        total += subtotal
        name_str = (it.get("name") or it.get("item_name") or "").lower()
        if "tiền công" in name_str or "công sửa" in name_str or "công kỹ thuật" in name_str:
            computed_labor_fee += subtotal
        else:
            computed_parts_cost += subtotal

    labor_fee = float(data.get("labor_fee") or data.get("laborCost") or computed_labor_fee)
    parts_cost = float(data.get("parts_cost") or data.get("partsCost") or computed_parts_cost)

    if data.get("total_amount"):
        total = float(data.get("total_amount"))
    elif data.get("estimated_price"):
        total = float(data.get("estimated_price"))
    elif labor_fee + parts_cost > 0:
        total = labor_fee + parts_cost

    import secrets
    quote_id = secrets.token_hex(5).upper()[:10]
    quote_record = {
        "id": quote_id,
        "repair_id": request_id,
        "diagnosis_note": diagnosis_note,
        "severity": severity,
        "labor_fee": labor_fee,
        "parts_cost": parts_cost,
        "estimated_price": total,
        "status": "PENDING",
        "created_by": current_user["sub"],
        "updated_by": current_user["sub"],
    }
    created_quote = repository.create_quote(quote_record)

    created_items = []
    for it in items:
        name = it.get("name") or it.get("item_name") or "Linh kiện"
        qty = float(it.get("quantity") or 1)
        price = float(it.get("price") or it.get("unit_price") or 0)
        subtotal = qty * price
        item_id = secrets.token_hex(5).upper()[:10]
        item_rec = {
            "id": item_id,
            "quote_id": quote_id,
            "item_name": name[:200],
            "quantity": qty,
            "unit_price": price,
            "subtotal": subtotal,
        }
        ci = repository.create_quote_item(item_rec)
        if ci:
            created_items.append(ci)
        else:
            created_items.append(item_rec)

    # Transition request status to WAITING_FOR_APPROVAL
    try:
        now_iso = datetime.now(timezone.utc).isoformat()
        repository.update_repair_request(request_id, {
            "status": "WAITING_FOR_APPROVAL",
            "diagnosed_at": now_iso,
            "total_amount": total,
            "updated_by": current_user["sub"],
        })
        repository.add_status_history({
            "id": _request_id(),
            "repair_id": request_id,
            "status": "WAITING_FOR_APPROVAL",
            "changed_by": current_user["sub"],
            "note": f"Kỹ thuật viên đã lập báo giá (Tổng: {total:,.0f} đ), chờ khách hàng duyệt",
        })
    except Exception as stat_err:
        logger.warning(f"Failed to update repair status on quote create: {stat_err}")

    if created_quote:
        created_quote["items"] = created_items
    return created_quote or {
        "id": quote_id,
        "repair_id": request_id,
        "labor_fee": labor_fee,
        "parts_cost": parts_cost,
        "estimated_price": total,
        "status": "PENDING",
        "items": created_items
    }


def fetch_quotes_for_request(request_id: str, current_user: dict):
    request = repository.get_repair_request_by_id(request_id)
    if not request:
        raise AppException(ErrorCode.REQUEST_NOT_FOUND)

    quotes = repository.get_quotes_by_repair_id(request_id)
    result = []
    for q in quotes:
        items = repository.get_quote_items(q["id"])
        q["items"] = items or []
        result.append(q)
    return result
