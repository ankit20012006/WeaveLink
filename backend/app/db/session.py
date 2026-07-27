from __future__ import annotations

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings

engine: AsyncEngine | None = None
SessionLocal: async_sessionmaker[AsyncSession] | None = None

if settings.database_url is None:
    pass
else:
    engine = create_async_engine(
        settings.database_url,
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
