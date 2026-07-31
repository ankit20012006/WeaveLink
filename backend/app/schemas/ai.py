from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

_CAMEL_CONFIG = ConfigDict(populate_by_name=True, serialize_by_alias=True)
StoryProvider = Literal["openai", "gemini"]


class StoryDraftRequest(BaseModel):
    provider: StoryProvider | None = None
    language: str | None = None
    photo_urls: list[str] = Field(default_factory=list, alias="photoUrls")
    seed_text: str | None = Field(default=None, alias="seedText")
    voice_transcript: str | None = Field(default=None, alias="voiceTranscript")
    context_notes: str | None = Field(default=None, alias="contextNotes")
    story_model: str | None = Field(default=None, alias="storyModel")
    max_tags: int = Field(default=6, ge=1, le=12, alias="maxTags")
    model_config = _CAMEL_CONFIG


class StoryDraftResponse(BaseModel):
    status: Literal["ready", "not_configured", "error"]
    story_title: str = Field(..., alias="storyTitle")
    story: str
    tags: list[str]
    language: str
    media_count: int = Field(..., alias="mediaCount")
    message: str | None = None
    model_config = _CAMEL_CONFIG


class VectorIndexRequest(BaseModel):
    product_id: str = Field(..., alias="productId")
    title: str = Field(..., alias="storyTitle")
    story: str
    tags: list[str] = Field(default_factory=list)
    language: str | None = None
    model_config = _CAMEL_CONFIG


class VectorIndexResponse(BaseModel):
    status: Literal["indexed", "not_configured", "error"]
    product_id: str = Field(..., alias="productId")
    vector_count: int = Field(..., alias="vectorCount")
    message: str | None = None
    model_config = _CAMEL_CONFIG


class VectorSearchRequest(BaseModel):
    query: str
    limit: int = Field(default=5, ge=1, le=12)
    model_config = _CAMEL_CONFIG


class VectorSearchMatch(BaseModel):
    product_id: str = Field(..., alias="productId")
    title: str = Field(..., alias="storyTitle")
    story: str
    tags: list[str] = Field(default_factory=list)
    score: float
    distance: float
    model_config = _CAMEL_CONFIG


class VectorSearchResponse(BaseModel):
    status: Literal["ready", "not_configured", "error"]
    results: list[VectorSearchMatch] = Field(default_factory=list)
    message: str | None = None
    model_config = _CAMEL_CONFIG
