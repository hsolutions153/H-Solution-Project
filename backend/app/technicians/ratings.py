# Đồng bộ điểm KTV với đánh giá của khách hàng.

from app.db.database import supabase


def sync_technician_rating(technician_id: str, current_rating=None) -> float | None:
    total = 0.0
    count = 0
    last_id = None
    while True:
        query = (
            supabase.table("reviews")
            .select("id,rating")
            .eq("technician_id", technician_id)
            .order("id")
            .limit(1000)
        )
        if last_id is not None:
            query = query.gt("id", last_id)
        response = query.execute()
        rows = response.data or []
        for row in rows:
            total += float(row["rating"])
            count += 1
        if len(rows) < 1000:
            break
        last_id = rows[-1]["id"]

    if not count:
        return None

    average = round(total / count, 2)
    if current_rating is None or float(current_rating) != average:
        supabase.table("technician_profiles").update({"rating_avg": average}).eq("user_id", technician_id).execute()
    return average
