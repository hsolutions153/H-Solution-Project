import logging
from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from postgrest.exceptions import APIError

from app.core.exceptions import AppException, ErrorCode

logger = logging.getLogger("h_solution")


def register_exception_handlers(app: FastAPI) -> None:

    @app.exception_handler(AppException)
    async def app_exception_handler(request: Request, exc: AppException):
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
            status.HTTP_400_BAD_REQUEST: ErrorCode.INTERNAL_SERVER_ERROR.value,
            status.HTTP_401_UNAUTHORIZED: ErrorCode.UNAUTHORIZED.value,
            status.HTTP_403_FORBIDDEN: ErrorCode.FORBIDDEN.value,
            status.HTTP_404_NOT_FOUND: ErrorCode.REQUEST_NOT_FOUND.value,
            status.HTTP_409_CONFLICT: ErrorCode.INVALID_STATUS_TRANSITION.value,
            status.HTTP_413_REQUEST_ENTITY_TOO_LARGE: ErrorCode.IMAGE_SIZE_TOO_LARGE.value,
            status.HTTP_415_UNSUPPORTED_MEDIA_TYPE: ErrorCode.IMAGE_TYPE_UNSUPPORTED.value,
            status.HTTP_422_UNPROCESSABLE_ENTITY: ErrorCode.VALIDATION_ERROR.value,
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

        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "code": ErrorCode.VALIDATION_ERROR.value,
                "message": "Dữ liệu gửi lên không đúng định dạng",
                "details": errors,
            },
        )

    @app.exception_handler(APIError)
    async def postgrest_exception_handler(request: Request, exc: APIError):
        logger.error(f"[Database Error] PostgREST APIError: {exc}")
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
