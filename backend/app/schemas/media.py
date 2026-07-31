from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

_CAMEL_CONFIG = ConfigDict(populate_by_name=True, serialize_by_alias=True)


class MediaUploadRequest(BaseModel):
    media_type: Literal["image", "audio", "video"] = Field(
        default="image",
        alias="mediaType",
    )
    actor_id: str = Field(default="weaver", alias="actorId")
    preferred_bucket: str | None = Field(default=None, alias="preferredBucket")
    model_config = _CAMEL_CONFIG


class MediaUploadResponse(BaseModel):
    status: Literal["uploaded", "not_configured", "invalid", "error"]
    provider: str | None = None
    bucket: str
    path: str
    url: str
    content_type: str | None = Field(default=None, alias="contentType")
    media_type: str = Field(..., alias="mediaType")
    bytes: int
    message: str | None = None
