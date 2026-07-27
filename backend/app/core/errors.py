from __future__ import annotations

from fastapi import status
from pydantic import BaseModel


class ErrorPayload(BaseModel):
    code: str
    message: str
    details: dict[str, object] = {}
    request_id: str | None = None


class ErrorResponse(BaseModel):
    error: ErrorPayload


class AppError(Exception):
    def __init__(
        self,
        code: str,
        message: str,
        status_code: int = status.HTTP_400_BAD_REQUEST,
        details: dict[str, object] | None = None,
    ) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status_code
        self.details = details or {}


class NotFoundError(AppError):
    def __init__(self, message: str, details: dict[str, object] | None = None) -> None:
        super().__init__("NOT_FOUND", message, status.HTTP_404_NOT_FOUND, details)

