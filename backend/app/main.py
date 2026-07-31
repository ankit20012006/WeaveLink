from __future__ import annotations

import logging
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.api.router import api_router
from app.core.config import settings
from app.core.constants import ERROR_CODE_INTERNAL, REQUEST_ID_HEADER
from app.core.errors import AppError
from app.core.logging import configure_logging
from app.db.bootstrap import bootstrap_catalog_schema_and_seed

logger = logging.getLogger("weavelink")


def _build_error_response(code: str, message: str, request_id: str | None) -> dict:
    return {
        "error": {
            "code": code,
            "message": message,
            "details": {},
            "request_id": request_id,
        }
    }


@asynccontextmanager
async def lifespan(app: FastAPI):  # noqa: ARG001
    configure_logging()
    logger.info("startup: weavelink api")
    if settings.app_env == "production" and not settings.database_url:
        raise RuntimeError("DATABASE_URL is required in production")
    try:
        await bootstrap_catalog_schema_and_seed()
        logger.info("startup: database bootstrap complete")
    except Exception:
        logger.exception("startup: database bootstrap failed")
        if settings.app_env == "production":
            raise
    yield
    logger.info("shutdown: weavelink api")


def create_app() -> FastAPI:
    # Keep OpenAPI available for the hackathon demo (and local/staging).
    show_docs = settings.app_env != "production" or settings.demo_seed_enabled

    app = FastAPI(
        title=settings.app_name,
        version="0.1.0",
        lifespan=lifespan,
        docs_url="/docs" if show_docs else None,
        redoc_url="/redoc" if show_docs else None,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins(),
        allow_methods=["*"],
        allow_headers=["*"],
        allow_credentials=True,
    )

    @app.middleware("http")
    async def request_id_middleware(request: Request, call_next):
        request_id = request.headers.get(REQUEST_ID_HEADER, str(uuid.uuid4()))
        response = await call_next(request)
        response.headers[REQUEST_ID_HEADER] = request_id
        return response

    @app.exception_handler(AppError)
    async def app_error_handler(request: Request, exc: AppError):
        request_id = request.headers.get(REQUEST_ID_HEADER)
        return JSONResponse(
            status_code=exc.status_code,
            content=_build_error_response(exc.code, exc.message, request_id),
        )

    @app.exception_handler(RequestValidationError)
    async def validation_error_handler(request: Request, exc: RequestValidationError):  # noqa: ARG001
        request_id = request.headers.get(REQUEST_ID_HEADER)
        return JSONResponse(
            status_code=422,
            content=_build_error_response(
                "VALIDATION_ERROR",
                "Validation failed",
                request_id,
            ),
        )

    @app.exception_handler(Exception)
    async def generic_error_handler(request: Request, exc: Exception):  # noqa: ARG001
        request_id = request.headers.get(REQUEST_ID_HEADER)
        logger.exception("unhandled_exception")
        message = (
            "Unexpected error"
            if settings.app_env == "production"
            else str(exc)
        )
        return JSONResponse(
            status_code=500,
            content=_build_error_response(ERROR_CODE_INTERNAL, message, request_id),
        )

    @app.get("/health")
    async def health_check() -> dict[str, str]:
        return {"status": "ok", "service": "weavelink-api"}

    @app.get("/ready")
    async def ready_check() -> dict[str, str]:
        from app.db.session import get_db
        from app.services.passport_chain import blockchain_is_configured

        try:
            async for db in get_db():
                if db is None:
                    if settings.database_url:
                        return {
                            "status": "degraded",
                            "database": "disconnected",
                            "blockchain": (
                                "configured"
                                if blockchain_is_configured()
                                else "not_configured"
                            ),
                        }
                    return {
                        "status": "degraded",
                        "database": "demo_store",
                        "blockchain": (
                            "configured"
                            if blockchain_is_configured()
                            else "not_configured"
                        ),
                    }
                await db.execute(text("SELECT 1"))
                break
            chain_status = (
                "configured" if blockchain_is_configured() else "not_configured"
            )
            return {
                "status": "ready" if blockchain_is_configured() else "degraded",
                "database": "connected",
                "blockchain": chain_status,
            }
        except Exception:
            return {
                "status": "degraded",
                "database": "disconnected",
                "blockchain": "unknown",
            }

    app.include_router(api_router, prefix="")

    return app


app = create_app()


def main() -> None:
    import os

    import uvicorn

    # Render (and most PaaS) inject PORT; fall back to APP_PORT / 8000 locally.
    port = int(os.environ.get("PORT", settings.app_port))

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=port,
        reload=settings.app_env != "production",
    )


if __name__ == "__main__":
    main()
