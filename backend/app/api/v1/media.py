from __future__ import annotations

from app.api.deps import require_optional_auth
from app.schemas.media import MediaUploadResponse
from app.services import media_service
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status

router = APIRouter(prefix="/media", tags=["media"])


@router.post("/upload", response_model=MediaUploadResponse)
async def upload_media_file(
    file: UploadFile = File(...),
    media_type: str = Form("image"),
    actor_id: str = Form("weaver"),
    preferred_bucket: str | None = Form(default=None),
    _user: dict[str, object] | None = Depends(require_optional_auth),
) -> MediaUploadResponse:
    del _user

    if not file:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="file is required",
        )

    try:
        content = await file.read()
        object_path = file.filename or "upload.bin"
        provider, bucket, object_path, url = await media_service.upload_media(
            actor_id=actor_id,
            media_type=media_type,
            filename=object_path,
            content=content,
            content_type=file.content_type or "application/octet-stream",
            preferred_bucket=preferred_bucket,
        )

        return MediaUploadResponse(
            status="uploaded",
            provider=provider,
            bucket=bucket,
            path=object_path,
            url=url,
            contentType=file.content_type or "application/octet-stream",
            mediaType=media_type,
            bytes=len(content),
        )
    except ValueError as exc:
        return MediaUploadResponse(
            status="invalid",
            provider="none",
            bucket=preferred_bucket or "product-media",
            path=file.filename or "upload.bin",
            url="",
            contentType=file.content_type or "application/octet-stream",
            mediaType=media_type,
            bytes=0,
            message=str(exc),
        )
    except RuntimeError as exc:
        return MediaUploadResponse(
            status="not_configured",
            provider="none",
            bucket=preferred_bucket or "product-media",
            path=file.filename or "upload.bin",
            url="",
            contentType=file.content_type or "application/octet-stream",
            mediaType=media_type,
            bytes=0,
            message=str(exc),
        )
    except Exception as exc:
        return MediaUploadResponse(
            status="error",
            provider="none",
            bucket=preferred_bucket or "product-media",
            path=file.filename or "upload.bin",
            url="",
            contentType=file.content_type or "application/octet-stream",
            mediaType=media_type,
            bytes=0,
            message=str(exc),
        )
