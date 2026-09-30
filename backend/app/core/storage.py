import logging
import os
from fastapi import UploadFile

from app.core.exceptions import AppException, ErrorCode
from app.db.database import supabase

logger = logging.getLogger(__name__)

REPAIR_IMAGES_BUCKET = "h-solution-uploads"

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
UPLOADS_DIR = os.path.join(BASE_DIR, "uploads")


def save_file_locally(file_content: bytes, file_path: str, content_type: str | None = None) -> str:
    """Lưu tệp tin vào thư mục uploads cục bộ và trả về URL công khai."""
    norm_path = file_path.lstrip("/").replace("\\", "/")
    # Bỏ tiền tố public/ nếu có để lưu trữ gọn gàng
    sub_path = norm_path[7:] if norm_path.startswith("public/") else norm_path

    # Đường dẫn file cục bộ
    target_path = os.path.join(UPLOADS_DIR, sub_path.replace("/", os.sep))
    os.makedirs(os.path.dirname(target_path), exist_ok=True)
    with open(target_path, "wb") as f:
        f.write(file_content)

    # Đồng thời lưu bản sao với đường dẫn đầy đủ nếu có tiền tố public/
    # để đảm bảo request tới /uploads/public/... hoặc /uploads/... đều tìm thấy file
    if norm_path != sub_path:
        full_target_path = os.path.join(UPLOADS_DIR, norm_path.replace("/", os.sep))
        os.makedirs(os.path.dirname(full_target_path), exist_ok=True)
        with open(full_target_path, "wb") as f:
            f.write(file_content)

    base_url = (
        os.getenv("BACKEND_PUBLIC_URL")
        or os.getenv("BACKEND_URL")
        or "http://127.0.0.1:8000"
    ).rstrip("/")

    return f"{base_url}/uploads/{sub_path}"


def upload_file_to_supabase(file: UploadFile, file_path: str) -> str:
    try:
        file.file.seek(0)
        file_content = file.file.read()
        if not file_content:
            raise AppException(ErrorCode.IMAGE_UPLOAD_FAILED, message="Tệp ảnh tải lên bị trống")

        # 1. Thử tải lên Supabase Storage
        try:
            supabase.storage.from_(REPAIR_IMAGES_BUCKET).upload(
                path=file_path,
                file=file_content,
                file_options={"content-type": file.content_type or "image/jpeg", "upsert": "true"},
            )
            public_url = supabase.storage.from_(REPAIR_IMAGES_BUCKET).get_public_url(file_path)
            if public_url:
                return public_url
        except Exception as sb_err:
            logger.warning(
                "Supabase storage upload failed (%s). Falling back to local storage.",
                sb_err,
            )

        # 2. Dự phòng: lưu file vào server cục bộ và trả về static URL
        return save_file_locally(file_content, file_path, file.content_type)

    except AppException:
        raise
    except Exception as exc:
        logger.error("Failed to upload image: %s", exc)
        raise AppException(ErrorCode.IMAGE_UPLOAD_FAILED)

