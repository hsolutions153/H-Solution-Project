from fastapi import APIRouter
from app.auth.router import router as auth_router
from app.technicians.router import router as technicians_router

api_router = APIRouter()

# Gom các router con lại
api_router.include_router(auth_router)
api_router.include_router(technicians_router)