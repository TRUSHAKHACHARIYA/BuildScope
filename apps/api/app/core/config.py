"""Application settings, loaded from environment variables (and an optional .env file)."""

from functools import lru_cache
from pathlib import Path
from typing import Annotated, Literal

from pydantic import Field, PostgresDsn, field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict

Environment = Literal["development", "test", "staging", "production"]
LogLevel = Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]


def _env_files() -> tuple[Path, ...]:
    """Monorepo root `.env` (shared by all apps), then a `.env` in the working directory.

    The root may not exist (e.g. inside the API container), in which case only cwd is used.
    """
    parents = Path(__file__).resolve().parents
    root_env = (parents[4] / ".env",) if len(parents) > 4 else ()
    return (*root_env, Path(".env"))


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=_env_files(), extra="ignore", frozen=True)

    app_name: str = "buildscope-api"
    app_version: str = "0.1.0"
    environment: Environment = "development"
    log_level: LogLevel = "INFO"
    log_json: bool = True

    database_url: PostgresDsn = Field(
        default=PostgresDsn("postgresql+asyncpg://buildscope:buildscope@localhost:5432/buildscope"),
    )
    database_connect_timeout_seconds: float = Field(default=3.0, gt=0)

    cors_origins: Annotated[list[str], NoDecode] = Field(
        default_factory=lambda: ["http://localhost:3000"]
    )

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _split_origins(cls, value: object) -> object:
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value

    @field_validator("database_url")
    @classmethod
    def _require_async_driver(cls, value: PostgresDsn) -> PostgresDsn:
        if value.scheme != "postgresql+asyncpg":
            msg = "DATABASE_URL must use the 'postgresql+asyncpg://' scheme"
            raise ValueError(msg)
        return value


@lru_cache
def get_settings() -> Settings:
    return Settings()
