from __future__ import annotations

import logging
from collections.abc import AsyncGenerator

from app.core.config import settings
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

engine: AsyncEngine | None = None
SessionLocal: async_sessionmaker[AsyncSession] | None = None
logger = logging.getLogger("weavelink")

db_url = settings.database_url_direct or settings.database_url
if db_url is None:
    db_url = settings.supabase_database_url
if db_url is not None:
    engine = create_async_engine(
        db_url,
        pool_pre_ping=True,
        echo=False,
    )
    SessionLocal = async_sessionmaker(
        bind=engine,
        autoflush=False,
        expire_on_commit=False,
    )


async def get_db() -> AsyncGenerator[AsyncSession | None, None]:
    if SessionLocal is None:
        yield None
        return

    async with SessionLocal() as session:
        yield session
