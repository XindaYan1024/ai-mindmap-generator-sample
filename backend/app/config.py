from __future__ import annotations

from functools import lru_cache
from typing import Literal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

AgentBackend = Literal["rule_based", "openai"]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
        # Don't JSON-decode complex fields (e.g. `cors_origins: list[str]`) from
        # env/.env. Without this, pydantic-settings tries `json.loads` on the raw
        # value and a plain `CORS_ORIGINS=http://localhost:5173` fails before our
        # `_split_cors_origins` validator can split the comma-separated string.
        enable_decoding=False,
    )

    agent_backend: AgentBackend = "rule_based"
    cors_origins: list[str] = Field(default_factory=lambda: ["http://localhost:5173"])
    log_level: str = "INFO"

    openai_api_key: str | None = None
    openai_model: str = "gpt-4o-mini"

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _split_cors_origins(cls, value: object) -> object:
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
