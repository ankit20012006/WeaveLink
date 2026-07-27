from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import UserProfile as UserProfileModel
from app.schemas.auth import UserProfile as UserProfileSchema


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _to_profile(row: UserProfileModel) -> UserProfileSchema:
    return UserProfileSchema(
        user_id=row.user_id,
        email=row.email,
        display_name=row.display_name,
        role=row.role,
        weaver_id=row.weaver_id,
        verified=row.verified,
    )


async def get_user_profile(
    db: AsyncSession,
    user_id: str,
) -> UserProfileSchema | None:
    try:
        row = await db.get(UserProfileModel, user_id)
    except SQLAlchemyError:
        return None
    if row is None:
        return None
    return _to_profile(row)


async def upsert_user_profile(
    db: AsyncSession,
    user_id: str,
    *,
    email: str | None,
    display_name: str | None = None,
    weaver_id: str | None = None,
    role: str | None = None,
    verified: bool | None = None,
) -> UserProfileSchema:
    try:
        row = await db.get(UserProfileModel, user_id)
        if row is None:
            row = UserProfileModel(
                user_id=user_id,
                email=email,
                display_name=display_name,
                role=role or "buyer",
                weaver_id=weaver_id,
                verified=bool(verified),
                created_at=_now(),
                updated_at=_now(),
            )
            db.add(row)
        else:
            if email is not None:
                row.email = email
            if display_name is not None:
                row.display_name = display_name
            if weaver_id is not None:
                row.weaver_id = weaver_id
            if role is not None:
                row.role = role
            if verified is not None:
                row.verified = verified
            row.updated_at = _now()

        await db.commit()
        await db.refresh(row)
        return _to_profile(row)
    except SQLAlchemyError:
        await db.rollback()
        raise
