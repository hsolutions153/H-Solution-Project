from fastapi import FastAPI
from app.auth.router import router as auth_router
from app.technicians.router import router as technician_router
app = FastAPI(title="H-Solution Backend", version="1.0.0")

app.include_router(auth_router, prefix="/api/v1")
app.include_router(technician_router, prefix="/api/v1")

@app.get("/")
def root():
    return {"message": "Welcome to H-Solution Backend API!"}