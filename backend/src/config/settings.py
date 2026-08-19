from functools import lru_cache
from typing import Literal
from pydantic import computed_field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Centralized, strongly-typed application configuration.
    Validates environment variables on startup.
    """
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Core Application
    PROJECT_NAME: str = "AI Logistics Brain"
    VERSION: str = "0.1.0"
    ENVIRONMENT: Literal["development", "staging", "production", "testing"] = "development"
    DEBUG: bool = True
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = "default-insecure-secret-key-change-in-production"

    # PostgreSQL & Redis Database
    POSTGRES_SERVER: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_USER: str = "logistics_user"
    POSTGRES_PASSWORD: str = "logistics_password"
    POSTGRES_DB: str = "logistics_brain"
    DATABASE_URL_OVERRIDE: str | None = None
    DATABASE_URL: str | None = None
    REDIS_URL: str = "redis://localhost:6379/0"

    # AI Reasoning Provider (Google Gemini)
    GEMINI_API_KEY: str | None = None
    GEMINI_MODEL: str = "gemini-2.5-flash"

    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: Literal["json", "console"] = "json"

    def model_post_init(self, __context: object) -> None:
        if not self.DATABASE_URL:
            if self.DATABASE_URL_OVERRIDE:
                self.DATABASE_URL = self.DATABASE_URL_OVERRIDE
            else:
                self.DATABASE_URL = (
                    f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
                    f"@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
                )


@lru_cache
def get_settings() -> Settings:
    """Cached singleton instance of application settings."""
    return Settings()


settings = get_settings()

