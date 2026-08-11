from fastapi import APIRouter
from app.auth.router import router as auth_router
from app.customers.router import router as customers_router
from app.dashboard.router import router as dashboard_router
from app.devices.router import router as devices_router
from app.orders.router import router as orders_router
from app.repair_requests.router import router as repair_requests_router
from app.technicians.router import router as technicians_router

api_router = APIRouter()

api_router.include_router(auth_router)
api_router.include_router(customers_router)
api_router.include_router(dashboard_router)
api_router.include_router(devices_router)
api_router.include_router(orders_router)
api_router.include_router(repair_requests_router)
api_router.include_router(technicians_router)
