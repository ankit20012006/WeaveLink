from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import AuthUser, get_user_id, resolve_auth_roles, require_auth
from app.db.session import get_db
from app.schemas.auth import AuthMe, AuthProfilePatch, AuthRoleList
from app.services.auth_db import get_user_profile, upsert_user_profile

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/me")
async def get_me(
    db: AsyncSession | None = Depends(get_db),
    user: AuthUser = Depends(require_auth),
    user_id: str | None = Depends(get_user_id),
) -> AuthMe:
    profile = None
    if db is not None and user_id:
        profile = await get_user_profile(db, user_id)
    return AuthMe(user=user, roles=resolve_auth_roles(user), profile=profile)


@router.get("/me/roles", response_model=AuthRoleList)
async def get_me_roles(user: AuthUser = Depends(require_auth)) -> AuthRoleList:
    return AuthRoleList(roles=resolve_auth_roles(user))


@router.patch("/me", response_model=AuthMe)
async def patch_me(
    payload: AuthProfilePatch,
    db: AsyncSession | None = Depends(get_db),
    user: AuthUser = Depends(require_auth),
    user_id: str | None = Depends(get_user_id),
) -> AuthMe:
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database unavailable",
        )
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing user id",
        )

    profile = await upsert_user_profile(
        db,
        user_id=user_id,
        email=payload.email,
        display_name=payload.display_name,
        weaver_id=payload.weaver_id,
        role=payload.role,
        verified=payload.verified,
    )
    return AuthMe(user=user, roles=resolve_auth_roles(user), profile=profile)
