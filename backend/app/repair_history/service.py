from collections import defaultdict

from app.auth import repository as auth_repository
from app.core.exceptions import AppException, ErrorCode
from app.customers.models import ADMIN_ROLE_CODE, CUSTOMER_ROLE_CODE
from app.repair_history import repository
from app.repair_requests.models import TECHNICIAN_ROLE_CODE


def _role_id(code: str) -> str:
    role = auth_repository.get_role_by_code(code)
    if not role:
        raise AppException(ErrorCode.ROLE_NOT_CONFIGURED)
    return role[0]["id"] if isinstance(role, list) else role["id"]


def _is_role(current_user: dict, code: str) -> bool:
    if current_user.get("role") == code:
        return True
    try:
        return current_user.get("role_id") == _role_id(code)
    except Exception:
        return False


def _enrich_repair_records(repairs: list[dict]) -> list[dict]:
    if not repairs:
        return []

    repair_ids = [r["id"] for r in repairs]
    tech_ids = [r["technician_id"] for r in repairs if r.get("technician_id")]

    # Lay anh dinh kem
    images = repository.get_images_by_repair_ids(repair_ids)
    images_by_repair = defaultdict(list)
    for img in images:
        images_by_repair[img["repair_id"]].append(img)

    # Lay thong tin ky thuat vien
    technicians = repository.get_technicians_by_ids(tech_ids)
    tech_by_id = {
        t["id"]: {"id": t["id"], "name": t.get("full_name", ""), "phone": t.get("phone")}
        for t in technicians
    }

    # Lay bao gia va phu tung da thay the
    quotes = repository.get_accepted_quotes_by_repair_ids(repair_ids)
    quote_ids = [q["id"] for q in quotes]
    quote_to_repair = {q["id"]: q["repair_id"] for q in quotes}
    
    quote_items = repository.get_quote_items_by_quote_ids(quote_ids)
    items_by_repair = defaultdict(list)
    for item in quote_items:
        repair_id = quote_to_repair.get(item["quote_id"])
        if repair_id:
            items_by_repair[repair_id].append({
                "item_name": item["item_name"],
                "item_type": item["item_type"],
                "quantity": item["quantity"],
                "unit_price": item["unit_price"],
            })

    # Lay danh gia tu khach hang
    reviews = repository.get_reviews_by_repair_ids(repair_ids)
    review_by_repair = {
        rev["repair_id"]: {"rating": rev["rating"], "comment": rev.get("comment")}
        for rev in reviews
    }

    result = []
    for r in repairs:
        record = {
            "repair_id": r["id"],
            "request_code": r["request_code"],
            "customer_id": r["customer_id"],
            "device_id": r["device_id"],
            "issue_type": r["issue_type"],
            "issue_description": r["issue_description"],
            "location_address": r["location_address"],
            "is_sos": r.get("is_sos", False),
            "status": r["status"],
            "assigned_at": r.get("assigned_at"),
            "diagnosed_at": r.get("diagnosed_at"),
            "completed_at": r.get("completed_at"),
            "total_amount": r.get("total_amount"),
            "technician": tech_by_id.get(r.get("technician_id")),
            "parts_replaced": items_by_repair.get(r["id"], []),
            "images": images_by_repair.get(r["id"], []),
            "review": review_by_repair.get(r["id"]),
        }
        result.append(record)
    return result


def fetch_device_lifecycle(device_id: str, current_user: dict):
    device = repository.get_device_by_id(device_id)
    if not device:
        raise AppException(ErrorCode.DEVICE_NOT_FOUND)

    # Chi chu so huu thiet bi hoac Admin moi duoc xem vong doi xe
    is_owner = (
        _is_role(current_user, CUSTOMER_ROLE_CODE)
        and device["customer_id"] == current_user["sub"]
    )
    if not is_owner and not _is_role(current_user, ADMIN_ROLE_CODE):
        raise AppException(ErrorCode.FORBIDDEN)

    repairs = repository.get_repairs_by_device_id(device_id)
    enriched_repairs = _enrich_repair_records(repairs)

    return {
        "device_id": device["id"],
        "customer_id": device["customer_id"],
        "model_name": device["model_name"],
        "manufacturer": device["manufacturer"],
        "device_type": device["device_type"],
        "serial_number": device.get("serial_number"),
        "frame_number": device.get("frame_number"),
        "image_url": device.get("image_url"),
        "notes": device.get("notes"),
        "purchase_date": device.get("purchase_date"),
        "total_repairs": len(enriched_repairs),
        "repairs": enriched_repairs,
    }


def fetch_repair_history(current_user: dict, customer_id: str | None, device_id: str | None, page: int, limit: int):
    # Neu la khach hang thi chi xem duoc lich su cua chinh minh
    if _is_role(current_user, CUSTOMER_ROLE_CODE):
        customer_id = current_user["sub"]
    elif not _is_role(current_user, ADMIN_ROLE_CODE):
        raise AppException(ErrorCode.FORBIDDEN)

    items, total = repository.get_repairs_history(
        customer_id=customer_id,
        device_id=device_id,
        page=page,
        limit=limit,
    )
    return {
        "items": _enrich_repair_records(items),
        "total": total,
        "page": page,
        "limit": limit,
    }
