from fastapi import APIRouter
from app.auth.router import router as auth_router
from app.devices.router import router as devices_router
from app.technicians.router import router as technicians_router

api_router = APIRouter()

api_router.include_router(auth_router)
api_router.include_router(devices_router)
api_router.include_router(technicians_router)
