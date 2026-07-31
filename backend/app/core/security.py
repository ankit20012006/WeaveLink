from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from typing import Any

import httpx
from app.core.config import settings
from jose import JWTError, jwt

_JWKS_CACHE_TTL_SECONDS = 300
_JWKS_CACHE_KEYS: list[dict[str, Any]] = []
_JWKS_CACHE_EXPIRES_AT = datetime.fromtimestamp(0, tz=timezone.utc)


def _auth_issuer() -> str:
    if settings.supabase_jwt_issuer:
        return settings.supabase_jwt_issuer
    if not settings.supabase_url:
        return ""
    return f"{settings.supabase_url.rstrip('/')}/auth/v1"


def _default_jwks_url() -> str:
    if settings.supabase_jwks_url:
        return settings.supabase_jwks_url
    if not settings.supabase_url:
        return ""
    return f"{settings.supabase_url.rstrip('/')}/auth/v1/.well-known/jwks.json"


def _candidate_jwks_urls() -> list[str]:
    values: list[str] = []
    configured = _default_jwks_url()
    if configured:
        values.append(configured)
    if settings.supabase_url:
        standard = (
            f"{settings.supabase_url.rstrip('/')}/auth/v1/"
            ".well-known/jwks.json"
        )
        if standard not in values:
            values.append(standard)
        alt = f"{settings.supabase_url.rstrip('/')}/auth/v1/keys"
        if alt not in values:
            values.append(alt)
    return values


def _refresh_jwks() -> list[dict[str, Any]]:
    global _JWKS_CACHE_EXPIRES_AT, _JWKS_CACHE_KEYS

    candidates = _candidate_jwks_urls()
    if not candidates:
        _JWKS_CACHE_KEYS = []
        _JWKS_CACHE_EXPIRES_AT = datetime.now(timezone.utc) + timedelta(
            seconds=_JWKS_CACHE_TTL_SECONDS,
        )
        return _JWKS_CACHE_KEYS

    last_error: Exception | None = None
    keys: list[dict[str, Any]] = []
    for jwks_url in candidates:
        try:
            headers = (
                {"apikey": settings.supabase_publishable_key}
                if settings.supabase_publishable_key
                else {}
            )
            response = httpx.get(jwks_url, headers=headers, timeout=4.0)
            response.raise_for_status()
            payload = response.json()
            candidate_keys = payload.get("keys") if isinstance(payload, dict) else None
            if not isinstance(candidate_keys, list):
                raise RuntimeError("Invalid JWKS payload")
            keys = [
                key
                for key in candidate_keys
                if isinstance(key, dict) and key.get("kid")
            ]
            if not keys:
                raise RuntimeError("JWKS payload has no kid")
            break
        except Exception as exc:  # noqa: BLE001
            last_error = exc

    if not keys:
        _JWKS_CACHE_KEYS = []
        _JWKS_CACHE_EXPIRES_AT = datetime.fromtimestamp(0, tz=timezone.utc)
        if last_error is None:
            raise RuntimeError("No JWKS endpoint available")
        raise RuntimeError(f"Unable to refresh JWKS: {last_error}") from last_error

    _JWKS_CACHE_KEYS = keys
    _JWKS_CACHE_EXPIRES_AT = datetime.now(timezone.utc) + timedelta(
        seconds=_JWKS_CACHE_TTL_SECONDS,
    )
    return _JWKS_CACHE_KEYS


def _get_jwks() -> list[dict[str, Any]]:
    if datetime.now(timezone.utc) >= _JWKS_CACHE_EXPIRES_AT:
        _refresh_jwks()
    return list(_JWKS_CACHE_KEYS)


def _locate_jwk_for_token(token: str) -> str:
    protected_header = jwt.get_unverified_header(token)
    kid = protected_header.get("kid")
    if not kid:
        raise ValueError("JWT missing key id")

    keys = _get_jwks()
    if not keys:
        keys = _refresh_jwks()

    for key in keys:
        if key.get("kid") == kid:
            return json.dumps(key)

    raise ValueError("JWT key not found")


def verify_supabase_jwt(token: str, audience: str, issuer: str) -> dict[str, object]:
    """
    Verify Supabase-issued JWTs using a local cached JWKS fetch.
    """
    if not token:
        raise ValueError("Missing token")

    jwk = _locate_jwk_for_token(token)
    try:
        return jwt.decode(
            token,
            key=jwk,
            algorithms=["RS256", "ES256", "EdDSA"],
            audience=audience,
            issuer=issuer or _auth_issuer() or None,
            options={
                "require": ["exp", "iss", "sub"],
            },
        )
    except JWTError as exc:
        raise ValueError(f"Invalid token: {exc}") from exc
