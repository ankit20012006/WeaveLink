from __future__ import annotations

import asyncio
import base64
import json
from typing import Any

from app.core.config import settings


def _coerce_float(value: str | None) -> float | None:
    if not value:
        return None
    try:
        return float(value)
    except ValueError:
        return None


def _build_story_prompt(
    *,
    language: str | None,
    seed_text: str | None,
    voice_transcript: str | None,
    context_notes: str | None,
    max_tags: int,
) -> tuple[str, list[str]]:
    lang = language.strip() if language else "English"
    base = (
        f"Create a strict JSON response for a handloom listing story in {lang}. "
        "Return fields: storyTitle (<= 55 chars), story (<= 600 chars), "
        "tags (array of short descriptors)."
    )

    hint = (
        "Use only facts a seller can verify. Do not invent certifications, "
        "origin claims, or material properties not stated by the prompt."
    )

    context = []
    if seed_text:
        context.append(f"Seller seed: {seed_text.strip()}")
    if voice_transcript:
        context.append(f"Voice transcript: {voice_transcript.strip()}")
    if context_notes:
        context.append(f"Context: {context_notes.strip()}")

    user_text = " ".join(context) if context else "No textual context supplied."
    user_message = f"{base} {hint} {user_text} Limit tags to at most {max_tags}."

    return user_message, [
        "{",
        '"storyTitle": "..."',
        '"story": "..."',
        '"tags": ["..."]',
        "}",
    ]


def _story_payload_from_json(raw: str | None) -> dict[str, Any]:
    if not raw:
        raise ValueError("Empty AI response")

    cleaned = raw.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.strip("`")

    data = json.loads(cleaned)
    if not isinstance(data, dict):
        raise ValueError("AI response was not an object")

    story_title = str(data.get("storyTitle") or data.get("title") or "").strip()
    story = str(data.get("story") or data.get("text") or "").strip()
    raw_tags = data.get("tags")
    tags: list[str] = []
    if isinstance(raw_tags, list):
        for tag in raw_tags:
            candidate = str(tag).strip()
            if candidate:
                tags.append(candidate)

    if not story_title:
        raise ValueError("AI response missing storyTitle")
    if not story:
        raise ValueError("AI response missing story")

    return {
        "storyTitle": story_title[:75],
        "story": story[:1400],
        "tags": tags[:12],
    }


def _has_openai_key() -> bool:
    return bool(settings.openai_api_key.strip())


def _has_gemini_key() -> bool:
    return bool(settings.google_ai_api_key.strip())


def _normalize_story_provider(provider: str | None) -> str:
    value = (provider or "openai").strip().lower()
    return value or "openai"


def _assert_story_provider(provider: str | None) -> str:
    normalized = _normalize_story_provider(provider)
    if normalized not in {"openai", "gemini"}:
        raise RuntimeError(f"AI story provider '{normalized}' is not supported.")
    return normalized


def _media_payload(photo_urls: list[str]) -> list[dict[str, Any]]:
    blocks: list[dict[str, Any]] = []
    for url in photo_urls[:4]:
        if not isinstance(url, str) or not url.strip():
            continue
        blocks.append(
            {
                "type": "image_url",
                "image_url": {
                    "url": url.strip(),
                    "detail": "low",
                },
            },
        )
    return blocks


def _story_build_result(
    *,
    parsed: dict[str, Any],
    language: str | None,
    photo_urls: list[str],
) -> dict[str, Any]:
    return {
        "status": "ready",
        "storyTitle": parsed["storyTitle"],
        "story": parsed["story"],
        "tags": parsed["tags"],
        "language": language or "English",
        "mediaCount": len(_media_payload(photo_urls)),
    }


def _coerce_mime_type(value: str | None) -> str:
    if not value:
        return "image/jpeg"
    lowered = value.split(";", 1)[0].strip().lower()
    return lowered if lowered.startswith("image/") else "image/jpeg"


async def _download_gemini_image_part(url: str) -> dict[str, str] | None:
    import httpx

    target = url.strip()
    if not target:
        return None

    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.get(target, follow_redirects=True)

    if response.status_code < 200 or response.status_code >= 300:
        return None

    content = response.content
    if not content:
        return None

    return {
        "mime_type": _coerce_mime_type(response.headers.get("content-type")),
        "data": base64.b64encode(content).decode("ascii"),
    }


async def _build_story_with_openai(
    *,
    language: str | None,
    photo_urls: list[str],
    seed_text: str | None,
    voice_transcript: str | None,
    context_notes: str | None,
    story_model: str | None,
    max_tags: int,
) -> dict[str, Any]:
    if not _has_openai_key():
        raise RuntimeError("OPENAI_API_KEY is not configured.")

    model = (story_model or settings.openai_story_model or "gpt-4o-mini").strip()
    if not model:
        model = "gpt-4o-mini"

    user_message, _ = _build_story_prompt(
        language=language,
        seed_text=seed_text,
        voice_transcript=voice_transcript,
        context_notes=context_notes,
        max_tags=max_tags,
    )

    content: list[dict[str, Any]] = [{"type": "text", "text": user_message}]
    content.extend(_media_payload(photo_urls))

    from openai import AsyncOpenAI

    client = AsyncOpenAI(api_key=settings.openai_api_key)
    response = await client.chat.completions.create(  # type: ignore[call-arg]
        model=model,
        messages=[
            {
                "role": "system",
                "content": (
                    "You are a strict catalog metadata assistant."
                    " Return JSON only and keep stories factual."
                ),
            },
            {
                "role": "user",
                "content": content,
            },
        ],
        response_format={"type": "json_object"},
        temperature=settings.openai_story_temperature,
        max_tokens=settings.openai_max_tokens,
    )

    raw = response.choices[0].message.content if response.choices else None
    parsed = _story_payload_from_json(raw)
    return _story_build_result(
        parsed=parsed,
        language=language,
        photo_urls=photo_urls,
    )


async def _build_story_with_gemini(
    *,
    language: str | None,
    photo_urls: list[str],
    seed_text: str | None,
    voice_transcript: str | None,
    context_notes: str | None,
    story_model: str | None,
    max_tags: int,
) -> dict[str, Any]:
    if not _has_gemini_key():
        raise RuntimeError("GOOGLE_AI_API_KEY is not configured.")

    model_name = (story_model or settings.gemini_story_model or "gemini-1.5-flash").strip()
    if not model_name:
        model_name = "gemini-1.5-flash"

    user_message, _ = _build_story_prompt(
        language=language,
        seed_text=seed_text,
        voice_transcript=voice_transcript,
        context_notes=context_notes,
        max_tags=max_tags,
    )

    media_parts: list[dict[str, Any]] = []
    for url in photo_urls[:4]:
        if not isinstance(url, str) or not url.strip():
            continue
        image_part = await _download_gemini_image_part(url)
        if image_part:
            media_parts.append(
                {
                    "inline_data": {
                        "mime_type": image_part["mime_type"],
                        "data": image_part["data"],
                    },
                },
            )

    content: list[Any] = [user_message]
    if media_parts:
        content.extend(media_parts)
    else:
        content.append(
            "No usable images were fetched from photoUrls; answer from textual context only.",
        )

    def _run() -> str | None:
        import google.generativeai as genai

        genai.configure(api_key=settings.google_ai_api_key)
        model = genai.GenerativeModel(model_name=model_name)
        response = model.generate_content(
            content,
            generation_config={
                "temperature": settings.gemini_story_temperature,
                "max_output_tokens": settings.gemini_max_output_tokens,
            },
        )
        return getattr(response, "text", None)

    raw = await asyncio.to_thread(_run)
    parsed = _story_payload_from_json(raw)
    return _story_build_result(
        parsed=parsed,
        language=language,
        photo_urls=photo_urls,
    )


async def build_story_draft(
    *,
    language: str | None,
    photo_urls: list[str],
    seed_text: str | None,
    voice_transcript: str | None,
    context_notes: str | None,
    provider: str | None,
    story_model: str | None,
    max_tags: int,
) -> dict[str, Any]:
    normalized = _assert_story_provider(provider)
    if normalized == "openai":
        return await _build_story_with_openai(
            language=language,
            photo_urls=photo_urls,
            seed_text=seed_text,
            voice_transcript=voice_transcript,
            context_notes=context_notes,
            story_model=story_model,
            max_tags=max_tags,
        )

    return await _build_story_with_gemini(
        language=language,
        photo_urls=photo_urls,
        seed_text=seed_text,
        voice_transcript=voice_transcript,
        context_notes=context_notes,
        story_model=story_model,
        max_tags=max_tags,
    )


async def _embed_text(value: str) -> list[float]:
    if not _has_openai_key():
        raise RuntimeError("OPENAI_API_KEY is not configured.")

    from openai import AsyncOpenAI

    client = AsyncOpenAI(api_key=settings.openai_api_key)
    response = await client.embeddings.create(
        model=settings.openai_embedding_model or "text-embedding-3-small",
        input=[value],
    )
    data = response.data
    if not data:
        raise RuntimeError("Embedding response is empty")
    return data[0].embedding


def _open_chroma_collection():
    import chromadb

    path = settings.chroma_persist_directory.strip() or ".weavelink-chroma"
    client = chromadb.PersistentClient(path=path)
    return client.get_or_create_collection(
        name="weavelink_story_index",
        metadata={"hnsw:space": "cosine"},
    )


def _vector_records_from_query_result(result: dict[str, Any]) -> list[dict[str, Any]]:
    if not result or not isinstance(result, dict):
        return []

    ids = result.get("ids", [])
    metadatas = result.get("metadatas", [])
    distances = result.get("distances", [])
    if not isinstance(ids, list) or not ids:
        return []

    rows = ids[0]
    meta_rows = metadatas[0] if isinstance(metadatas, list) and metadatas else []
    dist_rows = distances[0] if isinstance(distances, list) and distances else []

    out: list[dict[str, Any]] = []
    for idx, product_id in enumerate(rows):
        if not product_id:
            continue
        distance = 1.0
        if idx < len(dist_rows):
            numeric = _coerce_float(str(dist_rows[idx]))
            if numeric is not None:
                distance = max(0.0, min(1.0, numeric))
        score = max(0.0, 1.0 - float(distance))
        metadata = (
            meta_rows[idx]
            if idx < len(meta_rows) and isinstance(meta_rows[idx], dict)
            else {}
        )
        out.append(
            {
                "product_id": product_id,
                "story_title": str(metadata.get("story_title", "")),
                "story": str(metadata.get("story", "")),
                "tags": metadata.get("tags", []) if isinstance(metadata.get("tags"), list) else [],
                "score": score,
                "distance": float(distance),
            },
        )
    return out


async def upsert_story_vector(payload: dict[str, Any]) -> None:
    text = (
        f"{payload.get('storyTitle', '').strip()}\n\n{payload.get('story', '').strip()}"
    ).strip()
    if not text:
        raise ValueError("story/title are required")

    embedding = await _embed_text(text)
    metadata = {
        "story_title": str(payload.get("storyTitle", "")).strip(),
        "story": str(payload.get("story", "")).strip(),
        "tags": list(payload.get("tags", []) or []),
        "language": str(payload.get("language", "") or "").strip() or "English",
    }
    product_id = str(payload.get("product_id", "")).strip()
    if not product_id:
        raise ValueError("productId is required")

    def _worker() -> None:
        collection = _open_chroma_collection()
        collection.upsert(
            ids=[product_id],
            embeddings=[embedding],
            documents=[text],
            metadatas=[metadata],
        )

    await asyncio.to_thread(_worker)


async def search_story_vectors(query: str, limit: int) -> list[dict[str, Any]]:
    if not query.strip():
        return []

    embedding = await _embed_text(query.strip())
    limited = max(1, min(limit, max(1, settings.max_story_vector_hits)))

    def _worker() -> dict[str, Any]:
        collection = _open_chroma_collection()
        return collection.query(
            query_embeddings=[embedding],
            n_results=limited,
            include=["metadatas", "documents", "distances", "ids"],
        )

    result = await asyncio.to_thread(_worker)
    return _vector_records_from_query_result(result)
