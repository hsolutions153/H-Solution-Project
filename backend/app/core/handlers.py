import logging
from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from postgrest import APIError

from app.core.exceptions import AppException, ErrorCode

logger = logging.getLogger("h_solution")


def register_exception_handlers(app: FastAPI) -> None:

    @app.exception_handler(AppException)
    async def app_exception_handler(request: Request, exc: AppException):
        if exc.error_code == 401:
            logger.warning(f"[Auth 401] {request.method} {request.url.path} -> {exc.code}: {exc.message}")

        content = {
            "code": exc.code,
            "message": exc.message,
        }
        if exc.details is not None:
            content["details"] = exc.details

        return JSONResponse(status_code=exc.error_code, content=content, headers=exc.headers)

    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException):
        code_mapping = {
            400: ErrorCode.INTERNAL_SERVER_ERROR.value,
            401: ErrorCode.UNAUTHORIZED.value,
            403: ErrorCode.FORBIDDEN.value,
            404: ErrorCode.REQUEST_NOT_FOUND.value,
            409: ErrorCode.INVALID_STATUS_TRANSITION.value,
            413: ErrorCode.IMAGE_SIZE_TOO_LARGE.value,
            415: ErrorCode.IMAGE_TYPE_UNSUPPORTED.value,
            422: ErrorCode.VALIDATION_ERROR.value,
        }
        code = code_mapping.get(exc.status_code, ErrorCode.INTERNAL_SERVER_ERROR.value)

        return JSONResponse(
            status_code=exc.status_code,
            content={
                "code": code,
                "message": str(exc.detail),
            },
            headers=exc.headers,
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        errors = []
        for err in exc.errors():
            field_path = ".".join(str(loc) for loc in err.get("loc", []) if loc != "body")
            errors.append({
                "field": field_path or "root",
                "message": err.get("msg", "Dữ liệu không hợp lệ"),
                "type": err.get("type", "value_error"),
            })

        if request.url.path.endswith("/devices"):
            logger.warning("[Validation 422] %s %s -> %s", request.method, request.url.path, errors)

        return JSONResponse(
            status_code=422,
            content={
                "code": ErrorCode.VALIDATION_ERROR.value,
                "message": "Dữ liệu gửi lên không đúng định dạng",
                "details": errors,
            },
        )

    @app.exception_handler(APIError)
    async def postgrest_exception_handler(request: Request, exc: APIError):
        logger.error(f"[Database Error] PostgREST APIError: {exc}")
        # Constraints remain authoritative for concurrent writes. Treat rejected
        # input as a client error rather than leaking database internals in a 500.
        input_errors = {
            "23505": (409, "Dữ liệu đã tồn tại trong hệ thống"),
            "23503": (422, "Dữ liệu tham chiếu không hợp lệ hoặc đang được sử dụng"),
            "23502": (422, "Thiếu trường dữ liệu bắt buộc"),
            "23514": (422, "Dữ liệu không đáp ứng điều kiện hợp lệ"),
            "22001": (422, "Dữ liệu vượt quá độ dài cho phép"),
            "22003": (422, "Giá trị số vượt quá phạm vi cho phép"),
            "22P02": (422, "Dữ liệu không đúng kiểu yêu cầu"),
            "22007": (422, "Ngày giờ không hợp lệ"),
            "22008": (422, "Ngày giờ vượt quá phạm vi cho phép"),
        }
        if exc.code in input_errors:
            status_code, message = input_errors[exc.code]
            return JSONResponse(status_code=status_code, content={
                "code": ErrorCode.VALIDATION_ERROR.value,
                "message": message,
                "details": [{"field": "root", "message": message, "type": "database_constraint"}],
            })
        if exc.code == "42501":
            return JSONResponse(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                content={
                    "code": ErrorCode.DATABASE_ERROR.value,
                    "message": "Không đủ quyền ghi dữ liệu (Lỗi RLS 42501 trên Supabase). Cần cấu hình SUPABASE_SERVICE_KEY trong backend/.env hoặc tắt RLS/cấp policy cho bảng.",
                },
            )
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "code": ErrorCode.DATABASE_ERROR.value,
                "message": "Lỗi truy vấn cơ sở dữ liệu",
            },
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception):
        logger.exception(f"[Unhandled Server Error] Path: {request.url.path}, Error: {exc}")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "code": ErrorCode.INTERNAL_SERVER_ERROR.value,
                "message": "Đã xảy ra lỗi máy chủ nội bộ không mong muốn",
            },
        )
