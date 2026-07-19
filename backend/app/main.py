from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.settings import settings


app = FastAPI(title=settings.app_name)

cors_origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
# Always allow "null" origin so standalone file:// HTML pages can reach the API
if "null" not in cors_origins:
    cors_origins.append("null")
if cors_origins:
    _allow_origins = ["*"] if "*" in cors_origins else cors_origins
    app.add_middleware(
        CORSMiddleware,
        allow_origins=_allow_origins,
        # Credentials cannot be used with wildcard; disable only in that case
        allow_credentials=_allow_origins != ["*"],
        allow_methods=["*"],
        allow_headers=["*"],
    )

app.include_router(api_router, prefix=settings.api_v1_prefix)
from app.database import engine, Base

@app.on_event("startup")
def create_tables():
    Base.metadata.create_all(bind=engine)
    print("✅ Database tables created/verified")



@app.get("/")
def root():
    return {"message": "KrishiCore API is Live!", "version": "V2.2"}

# Duplicate IoT routes removed - logic is now handled in app/api/routes/iot.py

@app.get("/health")
def health() -> dict:
    return {"status": "ok", "app": settings.app_name, "environment": settings.environment}

