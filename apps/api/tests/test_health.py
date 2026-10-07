from fastapi import FastAPI
from fastapi.testclient import TestClient

from tests.conftest import override_database_status


def test_liveness_reports_ok_without_dependency_checks(client: TestClient) -> None:
    response = client.get("/health")

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["service"] == "buildscope-api"
    assert body["environment"] == "test"
    assert body["checks"] == {}


def test_readiness_ok_when_database_is_reachable(app: FastAPI, client: TestClient) -> None:
    override_database_status(app, "ok")

    response = client.get("/api/v1/health")

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["checks"] == {"database": "ok"}


def test_readiness_degraded_and_503_when_database_is_down(app: FastAPI, client: TestClient) -> None:
    override_database_status(app, "error")

    response = client.get("/api/v1/health")

    assert response.status_code == 503
    body = response.json()
    assert body["status"] == "degraded"
    assert body["checks"] == {"database": "error"}


def test_unknown_route_returns_404(client: TestClient) -> None:
    assert client.get("/api/v1/does-not-exist").status_code == 404
