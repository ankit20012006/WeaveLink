from __future__ import annotations

from app.api.v1 import ai, auth, catalog, comms, health, media
from app.core.config import settings
from fastapi import APIRouter

api_router = APIRouter()
api_router.include_router(
    health.router,
    prefix=settings.api_v1_prefix,
    tags=["health"],
)
api_router.include_router(catalog.router, prefix=settings.api_v1_prefix)
api_router.include_router(ai.router, prefix=settings.api_v1_prefix)
api_router.include_router(media.router, prefix=settings.api_v1_prefix)
api_router.include_router(comms.router, prefix=settings.api_v1_prefix)

# Backward-compatible legacy paths for clients still targeting unversioned catalog routes.
api_router.include_router(catalog.router, prefix="")
api_router.include_router(auth.router, prefix=settings.api_v1_prefix)
