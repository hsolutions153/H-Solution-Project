try:
    from fastapi import FastAPI
except ImportError as exc:
    raise ImportError(
        "FastAPI is required to run this application. Install it with `pip install fastapi`."
    ) from exc

from app.api.v1.api import api_router

app = FastAPI()

app.include_router(api_router, prefix="/api/v1")