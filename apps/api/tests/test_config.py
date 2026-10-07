from pathlib import Path
from typing import Any

import pytest
from pydantic import ValidationError

from app.core.config import Settings, _env_files


def make_settings(**overrides: Any) -> Settings:
    return Settings(_env_file=None, **overrides)


def test_defaults_are_development_safe() -> None:
    settings = make_settings()

    assert settings.environment == "development"
    assert settings.database_url.scheme == "postgresql+asyncpg"
    assert settings.cors_origins == ["http://localhost:3000"]


def test_cors_origins_parsed_from_comma_separated_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("CORS_ORIGINS", "http://a.test, http://b.test,")

    assert make_settings().cors_origins == ["http://a.test", "http://b.test"]


def test_rejects_non_async_database_driver() -> None:
    with pytest.raises(ValidationError, match="postgresql\\+asyncpg"):
        make_settings(database_url="postgresql://u:p@localhost:5432/db")


def test_rejects_unknown_environment() -> None:
    with pytest.raises(ValidationError):
        make_settings(environment="moon")


def test_env_files_include_repo_root_then_cwd() -> None:
    files = _env_files()

    assert files[-1] == Path(".env")
    assert files[0].name == ".env"
