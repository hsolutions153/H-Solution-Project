import os
import httpx
from dotenv import load_dotenv
from supabase import create_client, Client, ClientOptions

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

# Cấu hình httpx Client với HTTP/1.1 (http2=False) để khắc phục triệt để lỗi Server disconnected
# do Cloudflare/Supabase ngắt kết nối idle HTTP/2
custom_http_client = httpx.Client(
    http2=False,
    timeout=httpx.Timeout(60.0, connect=10.0),
    limits=httpx.Limits(max_keepalive_connections=20, max_connections=50, keepalive_expiry=20.0),
)

client_options = ClientOptions(httpx_client=custom_http_client)

# Khởi tạo Supabase client dùng chung
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY, options=client_options)