from app.db.database import supabase
from app.payments.models import (
    PAYMENT_HISTORY_TABLE,
    PAYMENTS_TABLE,
    REPAIR_QUOTES_TABLE,
    REPAIR_REQUESTS_TABLE,
)


def get_payment_by_repair_id(repair_id: str):
    response = (
        supabase.table(PAYMENTS_TABLE)
        .select("*")
        .eq("repair_id", repair_id)
        .maybe_single()
        .execute()
    )
    return response.data if response and hasattr(response, "data") else None


def get_payment_by_code(payment_code: str):
    response = (
        supabase.table(PAYMENTS_TABLE)
        .select("*")
        .eq("payment_code", payment_code)
        .maybe_single()
        .execute()
    )
    return response.data if response and hasattr(response, "data") else None


def create_payment(data: dict):
    response = supabase.table(PAYMENTS_TABLE).insert(data).execute()
    return response.data[0] if response and response.data else None


def update_payment(payment_id: str, data: dict):
    response = supabase.table(PAYMENTS_TABLE).update(data).eq("id", payment_id).execute()
    return response.data[0] if response and response.data else None


def update_unpaid_payment(payment_id: str, data: dict):
    response = supabase.table(PAYMENTS_TABLE).update(data).eq("id", payment_id).neq("payment_status", "PAID").execute()
    return response.data[0] if response and response.data else None


def begin_momo_payment(payment_id: str, data: dict):
    response = supabase.table(PAYMENTS_TABLE).update(data).eq("id", payment_id).eq("payment_status", "UNPAID").eq("payment_method", "QR").execute()
    return response.data[0] if response and response.data else None


def get_payment_by_transaction_code(transaction_code: str):
    response = supabase.table(PAYMENTS_TABLE).select("id").eq("transaction_code", transaction_code).maybe_single().execute()
    return response.data if response and hasattr(response, "data") else None


def add_payment_history(data: dict):
    response = supabase.table(PAYMENT_HISTORY_TABLE).insert(data).execute()
    return response.data[0] if response and response.data else None


def get_repair_request(repair_id: str):
    response = (
        supabase.table(REPAIR_REQUESTS_TABLE)
        .select("id,customer_id,technician_id,total_amount,status")
        .eq("id", repair_id)
        .maybe_single()
        .execute()
    )
    return response.data if response and hasattr(response, "data") else None


def get_accepted_quote(repair_id: str):
    response = (
        supabase.table(REPAIR_QUOTES_TABLE)
        .select("id,estimated_price")
        .eq("repair_id", repair_id)
        .eq("status", "ACCEPTED")
        .maybe_single()
        .execute()
    )
    return response.data if response and hasattr(response, "data") else None


def update_repair_payment_info(repair_id: str, data: dict):
    response = supabase.table(REPAIR_REQUESTS_TABLE).update(data).eq("id", repair_id).execute()
    return response.data[0] if response and response.data else None
