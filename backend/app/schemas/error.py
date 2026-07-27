from __future__ import annotations

from pydantic import BaseModel


class ErrorPayload(BaseModel):
    code: str
    message: str
    details: dict[str, object] = {}
    request_id: str | None = None


class ErrorResponse(BaseModel):
    error: ErrorPayload

