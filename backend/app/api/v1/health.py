from __future__ import annotations

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from fastapi import APIRouter, Depends, status

from app.db.session import get_db
from app.schemas.health import HealthStatus, ReadinessStatus
from app.core.config import settings

router = APIRouter()


@router.get("/health", response_model=HealthStatus, status_code=status.HTTP_200_OK)
async def health_check() -> HealthStatus:
    return HealthStatus(status="ok")


@router.get("/ready", response_model=ReadinessStatus)
async def readiness_check(db: AsyncSession | None = Depends(get_db)) -> ReadinessStatus:
    # No DATABASE_URL: in-memory demo store still serves catalog/RFQ for the showcase.
    if db is None:
        if settings.database_url:
            return ReadinessStatus(status="degraded", database="disconnected")
        return ReadinessStatus(status="ready", database="demo_store")

    try:
        await db.execute(text("SELECT 1"))
        await db.commit()
        return ReadinessStatus(status="ready", database="connected")
    except Exception:
        return ReadinessStatus(status="degraded", database="disconnected")
