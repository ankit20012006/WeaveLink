from __future__ import annotations

from typing import Literal

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_env: Literal["development", "staging", "production"] = "development"
    app_name: str = "WeaveLink API"
    app_port: int = 8000
    api_v1_prefix: str = "/api/v1"
    frontend_url: str = "http://localhost:3000"
    public_api_url: str = "http://127.0.0.1:8000"
    backend_cors_origins: str = "http://localhost:3000"
    database_url: str | None = None
    database_url_direct: str | None = None
    supabase_url: str = ""
    supabase_publishable_key: str = ""
    supabase_publishable_key_public: str = ""
    supabase_service_role_key: str = ""
    supabase_secret_key: str = ""
    supabase_jwt_issuer: str = ""
    supabase_jwt_audience: str = "authenticated"
    supabase_jwks_url: str = ""
    product_media_bucket: str = "product-media"
    story_audio_bucket: str = "story-audio"
    passport_assets_bucket: str = "passport-assets"
    profile_media_bucket: str = "profile-media"
    max_image_size_mb: int = 8
    max_audio_size_mb: int = 20
    max_video_size_mb: int = 50
    razorpay_api_key: str = ""
    razorpay_api_secret: str = ""
    sepolia_rpc_url: str = ""
    sepolia_private_key: str = ""
    sepolia_chain_id: int = 11155111
    sepolia_explorer_url: str = "https://sepolia.etherscan.io"
    sepolia_confirmations_required: int = 1
    weave_passport_contract_address: str = ""
    demo_seed_enabled: bool = False
    integrity_anchor_provider: str = "database_only"
    log_level: str = "INFO"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    @field_validator("backend_cors_origins", mode="before")
    @classmethod
    def split_cors_origins(cls, value: str | list[str]) -> str:
        if isinstance(value, str):
            return value
        return ",".join(value)

    @staticmethod
    def _to_asyncpg_url(value: str) -> str:
        """Accept Render/Supabase postgres URLs and force asyncpg driver."""
        cleaned = value.strip()
        if cleaned.startswith("postgres://"):
            cleaned = "postgresql://" + cleaned[len("postgres://") :]
        if cleaned.startswith("postgresql+asyncpg://"):
            return cleaned
        if cleaned.startswith("postgresql://"):
            return "postgresql+asyncpg://" + cleaned[len("postgresql://") :]
        return cleaned

    @field_validator("database_url", mode="before")
    @classmethod
    def normalize_database_url(cls, value: str | None) -> str | None:
        if not value or not str(value).strip():
            return None
        return cls._to_asyncpg_url(str(value))

    @field_validator("database_url_direct", mode="before")
    @classmethod
    def normalize_database_url_direct(cls, value: str | None) -> str | None:
        if not value or not str(value).strip():
            return None
        return cls._to_asyncpg_url(str(value))

    def allowed_origins(self) -> list[str]:
        return [origin.strip() for origin in self.backend_cors_origins.split(",") if origin.strip()]

    @field_validator("supabase_jwt_audience", mode="before")
    @classmethod
    def normalize_audience(cls, value: str | None) -> str:
        return (value or "authenticated").strip() or "authenticated"


settings = Settings()
