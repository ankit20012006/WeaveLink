from __future__ import annotations

from fastapi import APIRouter

from app.core.config import settings
from app.api.v1 import auth, catalog, health

api_router = APIRouter()
api_router.include_router(
    health.router,
    prefix=settings.api_v1_prefix,
    tags=["health"],
)
api_router.include_router(catalog.router, prefix=settings.api_v1_prefix)
api_router.include_router(auth.router, prefix=settings.api_v1_prefix)
