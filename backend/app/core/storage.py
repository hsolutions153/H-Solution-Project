import logging
import os
import uuid
from fastapi import UploadFile

from app.core.exceptions import AppException, ErrorCode
from app.db.database import supabase

logger = logging.getLogger(__name__)

REPAIR_IMAGES_BUCKET = "h-solution-uploads"
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
UPLOADS_DIR = os.path.join(BASE_DIR, "uploads")


def save_file_locally(file_content: bytes, file_path: str, content_type: str | None = None) -> str:
    norm_path = file_path.lstrip("/").replace("\\", "/")
    # Bỏ tiền tố public/ để lưu gọn
    sub_path = norm_path[7:] if norm_path.startswith("public/") else norm_path

    target_path = os.path.join(UPLOADS_DIR, sub_path.replace("/", os.sep))
    os.makedirs(os.path.dirname(target_path), exist_ok=True)
    with open(target_path, "wb") as f:
        f.write(file_content)

    # Lưu bản sao với đường dẫn đầy đủ để /uploads/public/... và /uploads/... đều tìm được
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

        # Thử tải lên Supabase Storage trước
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
            logger.warning("Supabase storage upload failed (%s). Falling back to local storage.", sb_err)

        # Dự phòng: lưu vào server cục bộ
        return save_file_locally(file_content, file_path, file.content_type)

    except AppException:
        raise
    except Exception as exc:
        logger.error("Failed to upload image: %s", exc)
        raise AppException(ErrorCode.IMAGE_UPLOAD_FAILED)


MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024


def validate_image_upload(file: UploadFile, *, max_size: int) -> str:
    # Kiểm tra kích thước và định dạng thật của tệp.
    file.file.seek(0, 2)
    size = file.file.tell()
    file.file.seek(0)
    if not size:
        raise AppException(ErrorCode.VALIDATION_ERROR, message="Tệp ảnh tải lên bị trống")
    if size > max_size:
        raise AppException(ErrorCode.IMAGE_SIZE_TOO_LARGE)
    header = file.file.read(12)
    file.file.seek(0)
    if header.startswith(b"\x89PNG\r\n\x1a\n"):
        actual = "png"
    elif header.startswith(b"\xff\xd8\xff"):
        actual = "jpg"
    elif header.startswith(b"RIFF") and header[8:12] == b"WEBP":
        actual = "webp"
    else:
        raise AppException(ErrorCode.IMAGE_TYPE_UNSUPPORTED)
    extension = file.filename.rsplit(".", 1)[-1].lower() if file.filename and "." in file.filename else ""
    extension = "jpg" if extension == "jpeg" else extension
    content_type = (file.content_type or "").lower()
    mime_formats = {"image/jpeg": "jpg", "image/jpg": "jpg", "image/pjpeg": "jpg",
                    "image/png": "png", "image/x-png": "png", "image/webp": "webp"}
    if extension and extension != actual:
        raise AppException(ErrorCode.IMAGE_TYPE_UNSUPPORTED)
    if content_type not in {"", "application/octet-stream"} and mime_formats.get(content_type) != actual:
        raise AppException(ErrorCode.IMAGE_TYPE_UNSUPPORTED)
    return actual


def upload_avatar(file: UploadFile, user_id: str) -> str:
    safe_ext = validate_image_upload(file, max_size=MAX_AVATAR_SIZE_BYTES)
    return upload_file_to_supabase(file, f"public/avatars/{user_id}/{uuid.uuid4()}.{safe_ext}")
