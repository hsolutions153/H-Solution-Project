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
