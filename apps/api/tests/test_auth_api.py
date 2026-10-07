import uuid

import httpx2
import pytest
from fastapi import FastAPI

from app.api.deps import get_token_verifier
from app.core.security import AuthProviderUnavailableError, TokenClaims
from tests.conftest import TokenFactory, UserFactory, bearer


async def test_me_returns_the_authenticated_user(
    api: httpx2.AsyncClient, make_user: UserFactory, make_token: TokenFactory
) -> None:
    user = await make_user(name="Grace Hopper", email="grace@example.com")

    response = await api.get("/api/v1/me", headers=bearer(make_token(user.id)))

    assert response.status_code == 200
    assert response.json() == {
        "id": str(user.id),
        "name": "Grace Hopper",
        "email": "grace@example.com",
    }


async def test_missing_token_is_401_with_challenge(api: httpx2.AsyncClient) -> None:
    response = await api.get("/api/v1/me")

    assert response.status_code == 401
    assert response.headers["www-authenticate"] == "Bearer"
    assert response.json() == {"detail": "Not authenticated"}


@pytest.mark.parametrize(
    "authorization",
    ["Bearer not-a-jwt", "Basic dXNlcjpwYXNz", "Bearer", "token-without-scheme"],
)
async def test_malformed_credentials_are_401(api: httpx2.AsyncClient, authorization: str) -> None:
    response = await api.get("/api/v1/me", headers={"Authorization": authorization})

    assert response.status_code == 401


async def test_valid_token_for_unknown_user_is_401(
    api: httpx2.AsyncClient, make_token: TokenFactory
) -> None:
    response = await api.get("/api/v1/me", headers=bearer(make_token(uuid.uuid4())))

    assert response.status_code == 401


async def test_expired_token_is_401(
    api: httpx2.AsyncClient, make_user: UserFactory, make_token: TokenFactory
) -> None:
    user = await make_user()

    response = await api.get("/api/v1/me", headers=bearer(make_token(user.id, exp=1)))

    assert response.status_code == 401


async def test_unavailable_auth_provider_is_503(api: httpx2.AsyncClient, app: FastAPI) -> None:
    class Unavailable:
        async def verify(self, token: str) -> TokenClaims:
            raise AuthProviderUnavailableError

    app.dependency_overrides[get_token_verifier] = Unavailable

    response = await api.get("/api/v1/me", headers=bearer("anything"))

    assert response.status_code == 503
