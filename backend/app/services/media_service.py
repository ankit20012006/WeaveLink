from __future__ import annotations

import mimetypes
import pathlib
import uuid

import httpx

from app.core.config import settings


def _max_bytes_for_media_type(media_type: str) -> int:
    if media_type == "image":
        return max(1, settings.max_image_size_mb) * 1024 * 1024
    if media_type == "audio":
        return max(1, settings.max_audio_size_mb) * 1024 * 1024
    return max(1, settings.max_video_size_mb) * 1024 * 1024


def _bucket_for_media_type(media_type: str, preferred_bucket: str | None = None) -> str:
    if preferred_bucket:
        return preferred_bucket
    mapping = {
        "image": settings.supabase_storage_bucket_product_media
        or settings.product_media_bucket
        or "product-media",
        "audio": settings.supabase_storage_bucket_story_audio
        or settings.story_audio_bucket
        or "story-audio",
        "video": settings.supabase_storage_bucket_product_media
        or settings.product_media_bucket
        or "product-media",
    }
    return mapping.get(media_type, settings.product_media_bucket or "product-media")


def _supabase_storage_url(bucket: str, path: str) -> str:
    return (
        f"{settings.supabase_url.rstrip('/')}/storage/v1/object/public/{bucket}/{path}"
    )


def _safe_filename(value: str) -> str:
    cleaned = "".join(ch if ch.isalnum() or ch in "._-" else "-" for ch in value)
    return cleaned[:100] or "upload.bin"


def _build_upload_path(media_type: str, filename: str, actor_id: str) -> str:
    stem = pathlib.Path(filename).stem[:40] or "upload"
    suffix = pathlib.Path(filename).suffix
    slug = _safe_filename(stem)
    suffix = suffix.lower() if suffix else ""
    ext = f"{suffix}" if suffix else ""
    return f"{actor_id.strip()}/{media_type}/{uuid.uuid4().hex}/{slug}{ext}"


def _is_configured_supabase() -> bool:
    return bool(
        settings.supabase_url.strip()
        and settings.supabase_service_role_key.strip()
    )


def _is_configured_s3() -> bool:
    return bool(
        settings.aws_s3_bucket.strip()
        and settings.aws_access_key_id.strip()
        and settings.aws_secret_access_key.strip()
        and settings.aws_region_name.strip()
    )


async def _upload_to_supabase(
    *,
    bucket: str,
    path: str,
    content: bytes,
    content_type: str,
) -> str:
    if not _is_configured_supabase():
        raise RuntimeError("SUPABASE service role is not configured")

    url = f"{settings.supabase_url.rstrip('/').rstrip('/')}/storage/v1/object/{bucket}/{path}"
    headers = {
        "Authorization": f"Bearer {settings.supabase_service_role_key}",
        "apikey": settings.supabase_service_role_key,
        "Content-Type": content_type or "application/octet-stream",
        "x-upsert": "false",
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            url,
            headers=headers,
            content=content,
            follow_redirects=True,
        )
        if response.status_code not in {200, 201}:
            raise RuntimeError(
                "Supabase upload failed: "
                f"{response.status_code} {response.text[:200]}"
            )

    return _supabase_storage_url(bucket, path)


async def upload_media(
    *,
    actor_id: str,
    media_type: str,
    filename: str,
    content: bytes,
    content_type: str,
    preferred_bucket: str | None,
) -> tuple[str, str, str, str]:
    if media_type not in {"image", "audio", "video"}:
        raise ValueError("mediaType must be image, audio, or video")

    max_size = _max_bytes_for_media_type(media_type)
    if len(content) > max_size:
        raise ValueError(f"Uploaded file exceeds configured limit for {media_type}")

    bucket = _bucket_for_media_type(media_type, preferred_bucket)
    path = _build_upload_path(media_type, filename, actor_id or "anonymous")

    if content_type:
        detected = content_type
    else:
        detected, _ = mimetypes.guess_type(filename)
        detected = detected or "application/octet-stream"

    if _is_configured_supabase():
        url = await _upload_to_supabase(
            bucket=bucket,
            path=path,
            content=content,
            content_type=detected,
        )
        return ("supabase", bucket, path, url)

    if _is_configured_s3():
        import boto3

        client = boto3.client(
            "s3",
            aws_access_key_id=settings.aws_access_key_id,
            aws_secret_access_key=settings.aws_secret_access_key,
            region_name=settings.aws_region_name,
        )
        client.put_object(
            Bucket=settings.aws_s3_bucket,
            Key=path,
            Body=content,
            ContentType=detected,
        )
        url = f"https://{settings.aws_s3_bucket}.s3.{settings.aws_region_name}.amazonaws.com/{path}"
        return ("s3", bucket, path, url)

    raise RuntimeError("No configured object storage backend")
