from __future__ import annotations

from pydantic import BaseModel


class HealthStatus(BaseModel):
    status: str
    service: str = "weavelink-api"


class ReadinessStatus(BaseModel):
    status: str
    database: str

