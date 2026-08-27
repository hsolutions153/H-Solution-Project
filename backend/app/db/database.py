import os
from pathlib import Path

from dotenv import load_dotenv
from supabase import create_client, Client

BACKEND_DIR = Path(__file__).resolve().parents[2]
load_dotenv(BACKEND_DIR / ".env")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

# Khởi tạo Supabase client dùng chung
if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError("Missing SUPABASE_URL or SUPABASE_KEY in backend/.env")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
