import pytest
from fastapi.testclient import TestClient

from app.core.middleware import REQUEST_ID_HEADER


def test_generates_request_id_when_missing(client: TestClient) -> None:
    response = client.get("/health")

    request_id = response.headers[REQUEST_ID_HEADER]
    assert len(request_id) == 32


def test_echoes_valid_incoming_request_id(client: TestClient) -> None:
    response = client.get("/health", headers={REQUEST_ID_HEADER: "abc-123.def_4"})

    assert response.headers[REQUEST_ID_HEADER] == "abc-123.def_4"


@pytest.mark.parametrize("bad_id", ["has spaces", "x" * 129, "inject\r\nheader", "<script>"])
def test_replaces_unsafe_incoming_request_id(client: TestClient, bad_id: str) -> None:
    response = client.get("/health", headers={REQUEST_ID_HEADER: bad_id})

    assert response.headers[REQUEST_ID_HEADER] != bad_id
    assert len(response.headers[REQUEST_ID_HEADER]) == 32


def test_cors_allows_configured_origin(client: TestClient) -> None:
    response = client.options(
        "/api/v1/health",
        headers={"Origin": "http://localhost:3000", "Access-Control-Request-Method": "GET"},
    )

    assert response.headers["access-control-allow-origin"] == "http://localhost:3000"


def test_cors_rejects_unknown_origin(client: TestClient) -> None:
    response = client.options(
        "/api/v1/health",
        headers={"Origin": "https://evil.example", "Access-Control-Request-Method": "GET"},
    )

    assert "access-control-allow-origin" not in response.headers
