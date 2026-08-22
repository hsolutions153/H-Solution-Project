from fastapi import FastAPI
from app.api.v1.api import api_router
from app.core.handlers import register_exception_handlers

app = FastAPI()

register_exception_handlers(app)

app.include_router(api_router, prefix="/api/v1")