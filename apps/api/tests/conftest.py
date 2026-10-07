from collections.abc import Iterator

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.deps import get_database_status
from app.core.config import Settings
from app.main import create_app
from app.schemas.health import DependencyStatus


@pytest.fixture
def settings() -> Settings:
    return Settings(environment="test", log_json=False, _env_file=None)


@pytest.fixture
def app(settings: Settings) -> FastAPI:
    return create_app(settings)


@pytest.fixture
def client(app: FastAPI) -> Iterator[TestClient]:
    with TestClient(app) as test_client:
        yield test_client


def override_database_status(app: FastAPI, status: DependencyStatus) -> None:
    async def _status() -> DependencyStatus:
        return status

    app.dependency_overrides[get_database_status] = _status
