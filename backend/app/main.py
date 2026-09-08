import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.api import api_router
from app.core.handlers import register_exception_handlers


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Background worker quét các đơn hàng quá 2 phút chưa được KTV tiếp nhận
    async def auto_timeout_worker():
        from app.repair_requests.service import reassign_timed_out_requests
        while True:
            try:
                reassign_timed_out_requests(timeout_seconds=120)
            except Exception:
                pass
            await asyncio.sleep(10)

    worker_task = asyncio.create_task(auto_timeout_worker())
    yield
    worker_task.cancel()


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
        "http://localhost:3003",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://127.0.0.1:3002",
        "http://127.0.0.1:3003",
    ],
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_exception_handlers(app)

app.include_router(api_router, prefix="/api/v1")