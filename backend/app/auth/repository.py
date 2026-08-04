from app.db.database import supabase

def get_user_by_email(email: str):
    response = supabase.table("users").select("*, roles(code, name)").eq("email", email).execute()
    return response.data[0] if response.data else None

def get_user_by_id(user_id: str):
    response = supabase.table("users").select("*, roles(code, name)").eq("id", user_id).execute()
    return response.data[0] if response.data else None

def create_user(data: dict):
    response = supabase.table("users").insert(data).execute()
    return response.data[0] if response.data else None