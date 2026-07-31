from __future__ import annotations

from app.api.deps import require_optional_auth
from app.schemas.ai import (
    StoryDraftRequest,
    StoryDraftResponse,
    VectorIndexRequest,
    VectorIndexResponse,
    VectorSearchMatch,
    VectorSearchRequest,
    VectorSearchResponse,
)
from app.services import ai_service
from fastapi import APIRouter, Depends

router = APIRouter(prefix="/ai", tags=["ai"])


@router.post("/story/draft", response_model=StoryDraftResponse)
async def draft_story(
    payload: StoryDraftRequest,
    _user: dict[str, object] | None = Depends(require_optional_auth),
) -> StoryDraftResponse:
    del _user
    try:
        result = await ai_service.build_story_draft(
            language=payload.language,
            photo_urls=payload.photo_urls,
            seed_text=payload.seed_text,
            voice_transcript=payload.voice_transcript,
            context_notes=payload.context_notes,
            provider=payload.provider,
            story_model=payload.story_model,
            max_tags=payload.max_tags,
        )
        return StoryDraftResponse(**result)
    except RuntimeError as exc:
        return StoryDraftResponse(
            status="not_configured",
            storyTitle="Story draft unavailable",
            story="",
            tags=[],
            language=payload.language or "English",
            mediaCount=len(payload.photo_urls),
            message=str(exc),
        )
    except Exception as exc:
        return StoryDraftResponse(
            status="error",
            storyTitle="Error",
            story="",
            tags=[],
            language=payload.language or "English",
            mediaCount=len(payload.photo_urls),
            message=str(exc),
        )


@router.post("/story/index", response_model=VectorIndexResponse)
async def index_story(payload: VectorIndexRequest) -> VectorIndexResponse:
    try:
        await ai_service.upsert_story_vector(
            {
                "product_id": payload.product_id,
                "storyTitle": payload.title,
                "story": payload.story,
                "tags": payload.tags,
                "language": payload.language,
            },
        )
        return VectorIndexResponse(
            status="indexed",
            productId=payload.product_id,
            vectorCount=1,
        )
    except RuntimeError as exc:
        return VectorIndexResponse(
            status="not_configured",
            productId=payload.product_id,
            vectorCount=0,
            message=str(exc),
        )
    except Exception as exc:
        return VectorIndexResponse(
            status="error",
            productId=payload.product_id,
            vectorCount=0,
            message=str(exc),
        )


@router.post("/story/search", response_model=VectorSearchResponse)
async def search_story(payload: VectorSearchRequest) -> VectorSearchResponse:
    try:
        matches = await ai_service.search_story_vectors(
            payload.query,
            payload.limit,
        )
        results: list[VectorSearchMatch] = [
            VectorSearchMatch(
                productId=str(item.get("product_id", "")),
                storyTitle=str(item.get("story_title", "")),
                story=str(item.get("story", "")),
                tags=item.get("tags") if isinstance(item.get("tags"), list) else [],
                score=float(item.get("score", 0.0)),
                distance=float(item.get("distance", 1.0)),
            )
            for item in matches
        ]
        return VectorSearchResponse(
            status="ready",
            results=results,
        )
    except RuntimeError as exc:
        return VectorSearchResponse(
            status="not_configured",
            results=[],
            message=str(exc),
        )
    except Exception as exc:
        return VectorSearchResponse(
            status="error",
            results=[],
            message=str(exc),
        )
