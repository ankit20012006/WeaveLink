from __future__ import annotations

from collections.abc import Callable

from app.core import security
from app.core.config import settings
from app.db.session import get_db
from app.services.auth_db import get_user_profile
from fastapi import Depends, Header, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

AuthUser = dict[str, object]

DEMO_WEAVER_HEADER = "X-Demo-Weaver-Id"


def extract_bearer_token(authorization: str | None) -> str | None:
    if not authorization:
        return None
    if not authorization.lower().startswith("bearer "):
        return None
    token = authorization[7:].strip()
    return token or None


def _bad_token(detail: str) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=detail,
        headers={"WWW-Authenticate": "Bearer"},
    )


def _demo_weaver_user(weaver_id: str) -> AuthUser:
    cleaned = weaver_id.strip()
    return {
        "sub": cleaned,
        "weaver_id": cleaned,
        "role": "weaver",
        "app_metadata": {
            "weaver_id": cleaned,
            "roles": ["weaver"],
            "verified": True,
        },
        "user_metadata": {
            "weaver_id": cleaned,
        },
    }


def _demo_user_from_header(demo_weaver_id: str | None) -> AuthUser | None:
    if not settings.demo_seed_enabled:
        return None
    if not demo_weaver_id or not demo_weaver_id.strip():
        return None
    return _demo_weaver_user(demo_weaver_id)


def require_optional_auth(
    authorization: str | None = Header(default=None),
    x_demo_weaver_id: str | None = Header(default=None, alias=DEMO_WEAVER_HEADER),
) -> AuthUser | None:
    demo_user = _demo_user_from_header(x_demo_weaver_id)
    if demo_user is not None:
        return demo_user

    token = extract_bearer_token(authorization)
    if token is None:
        return None
    try:
        claims = security.verify_supabase_jwt(
            token=token,
            audience=settings.supabase_jwt_audience,
            issuer=_issuer_for_verification(),
        )
        return dict(claims)
    except Exception as exc:
        raise _bad_token(str(exc)) from exc


def require_auth(
    authorization: str | None = Header(default=None),
    x_demo_weaver_id: str | None = Header(default=None, alias=DEMO_WEAVER_HEADER),
) -> AuthUser:
    user = require_optional_auth(
        authorization=authorization,
        x_demo_weaver_id=x_demo_weaver_id,
    )
    if user is None:
        raise _bad_token("Missing bearer token")
    return user


def _issuer_for_verification() -> str:
    if settings.supabase_jwt_issuer:
        return settings.supabase_jwt_issuer
    return f"{settings.supabase_url.rstrip('/')}/auth/v1" if settings.supabase_url else ""


def get_claimed_weaver_id(user: AuthUser) -> str | None:
    direct_candidates = ("weaver_id", "seller_id", "profile_id", "coop_id")
    for candidate in direct_candidates:
        value = user.get(candidate)
        if isinstance(value, str) and value.strip():
            return value.strip()

    app_metadata = user.get("app_metadata")
    if isinstance(app_metadata, dict):
        candidate = app_metadata.get("weaver_id")
        if isinstance(candidate, str) and candidate.strip():
            return candidate.strip()
        seller_metadata = app_metadata.get("seller_id")
        if isinstance(seller_metadata, str) and seller_metadata.strip():
            return seller_metadata.strip()

    user_metadata = user.get("user_metadata")
    if isinstance(user_metadata, dict):
        candidate = user_metadata.get("weaver_id")
        if isinstance(candidate, str) and candidate.strip():
            return candidate.strip()

    return None


def get_claimed_email(user: AuthUser) -> str | None:
    value = user.get("email")
    if isinstance(value, str) and value.strip():
        return value.strip()
    metadata = user.get("user_metadata")
    if isinstance(metadata, dict):
        value = metadata.get("email")
        if isinstance(value, str) and value.strip():
            return value.strip()
    return None


def _collect_roles(claims: AuthUser) -> set[str]:
    roles: set[str] = set()

    role = claims.get("role")
    if isinstance(role, str):
        roles.add(role.strip().lower())

    app_metadata = claims.get("app_metadata")
    if isinstance(app_metadata, dict):
        app_roles = app_metadata.get("roles")
        if isinstance(app_roles, list):
            for item in app_roles:
                if isinstance(item, str):
                    roles.add(item.strip().lower())

    return roles


def resolve_auth_roles(user: AuthUser | None) -> list[str]:
    if user is None:
        return []
    return sorted(_collect_roles(user))


def require_role(*roles: str) -> Callable[[AuthUser], AuthUser]:
    normalized_roles = {role.strip().lower() for role in roles if role.strip()}

    def _resolver(user: AuthUser = Depends(require_auth)) -> AuthUser:
        token_roles = set(_collect_roles(user))
        if normalized_roles and not (normalized_roles & token_roles):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient role",
            )
        return user

    return _resolver


async def require_verified_weaver(
    user: AuthUser = Depends(require_auth),
    db: AsyncSession | None = Depends(get_db),
) -> AuthUser:
    roles = _collect_roles(user)
    if "admin" in roles:
        return user

    user_id = user.get("sub")
    profile = (
        await get_user_profile(db, user_id)
        if db is not None and isinstance(user_id, str)
        else None
    )
    profile_is_verified_weaver = bool(
        profile
        and profile.verified
        and profile.role.strip().lower() in {"weaver", "seller"},
    )
    app_metadata = user.get("app_metadata")
    claim_is_verified = bool(
        isinstance(app_metadata, dict)
        and app_metadata.get("verified") is True
        and ({"weaver", "seller"} & roles),
    )
    if not profile_is_verified_weaver and not claim_is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="A verified weaver profile is required",
        )
    return user


def get_user_id(
    user: AuthUser = Depends(require_auth),  # type: ignore[assignment]
) -> str | None:
    value = user.get("sub") if user else None
    if isinstance(value, str):
        return value
    return None


def ensure_request_has_auth(
    request: Request,
    user: AuthUser = Depends(require_optional_auth),  # type: ignore[assignment]
) -> Request:
    request.state.auth_user = user
    return request
