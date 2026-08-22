import os
from fastapi import UploadFile
from supabase import create_client, Client

from app.core.exceptions import AppException, ErrorCode

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError("Supabase URL and Key must be set in environment variables for the application to start.")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

REPAIR_IMAGES_BUCKET = "h-solution-uploads"


def upload_file_to_supabase(file: UploadFile, file_path: str) -> str:
    try:
        file_content = file.file.read()

        supabase.storage.from_(REPAIR_IMAGES_BUCKET).upload(
            path=file_path,
            file=file_content,
            file_options={"content-type": file.content_type, "upsert": "true"},
        )

        public_url = supabase.storage.from_(REPAIR_IMAGES_BUCKET).get_public_url(file_path)

        return public_url

    except Exception:
        raise AppException(ErrorCode.IMAGE_UPLOAD_FAILED)
