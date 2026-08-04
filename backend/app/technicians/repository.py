from app.db.database import supabase
from app.technicians.models import TECHNICIANS_TABLE


def get_all_technicians():
    return supabase.table(TECHNICIANS_TABLE).select("*").order("full_name").execute().data


def get_technician_by_id(tech_id: str):
    response = supabase.table(TECHNICIANS_TABLE).select("*").eq("id", tech_id).maybe_single().execute()
    return response.data


def get_technician_by_email(email: str):
    response = supabase.table(TECHNICIANS_TABLE).select("*").eq("email", email).maybe_single().execute()
    return response.data


def insert_technician(data: dict):
    response = supabase.table(TECHNICIANS_TABLE).insert(data).execute()
    return response.data[0]


def update_technician_in_db(tech_id: str, data: dict):
    response = supabase.table(TECHNICIANS_TABLE).update(data).eq("id", tech_id).execute()
    return response.data[0] if response.data else None


def delete_technician_from_db(tech_id: str):
    response = supabase.table(TECHNICIANS_TABLE).delete().eq("id", tech_id).execute()
    return response.data[0] if response.data else None
