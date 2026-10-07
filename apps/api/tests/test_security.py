import time
import uuid
from typing import Any

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey

from app.core.security import (
    AuthenticationError,
    AuthProviderUnavailableError,
    JwksKeyResolver,
    JwtVerifier,
)
from tests.conftest import AUDIENCE, ISSUER, TokenFactory


async def test_valid_token_returns_subject(
    token_verifier: JwtVerifier, make_token: TokenFactory
) -> None:
    user_id = uuid.uuid4()

    claims = await token_verifier.verify(make_token(user_id))

    assert claims.subject == user_id


@pytest.mark.parametrize(
    "overrides",
    [
        pytest.param({"exp": int(time.time()) - 120}, id="expired"),
        pytest.param({"iss": "http://evil.test"}, id="wrong-issuer"),
        pytest.param({"aud": "another-api"}, id="wrong-audience"),
        pytest.param({"exp": None}, id="missing-exp"),
        pytest.param({"iat": None}, id="missing-iat"),
        pytest.param({"nbf": int(time.time()) + 3600}, id="not-yet-valid"),
    ],
)
async def test_rejects_invalid_claims(
    token_verifier: JwtVerifier, make_token: TokenFactory, overrides: dict[str, Any]
) -> None:
    with pytest.raises(AuthenticationError):
        await token_verifier.verify(make_token(uuid.uuid4(), **overrides))


async def test_rejects_non_uuid_subject(
    token_verifier: JwtVerifier, make_token: TokenFactory
) -> None:
    with pytest.raises(AuthenticationError, match="subject"):
        await token_verifier.verify(make_token("not-a-uuid"))


async def test_rejects_token_signed_by_another_key(token_verifier: JwtVerifier) -> None:
    now = int(time.time())
    forged = jwt.encode(
        {"sub": str(uuid.uuid4()), "iss": ISSUER, "aud": AUDIENCE, "iat": now, "exp": now + 60},
        Ed25519PrivateKey.generate(),
        algorithm="EdDSA",
    )

    with pytest.raises(AuthenticationError):
        await token_verifier.verify(forged)


async def test_rejects_symmetric_algorithm() -> None:
    """An HS256 token must be rejected even if its secret equals the public key bytes."""
    secret = "a-shared-secret-that-is-long-enough-for-hs256"  # noqa: S105 - test value

    async def resolve(_token: str) -> Any:
        return secret

    verifier = JwtVerifier(resolve, issuer=ISSUER, audience=AUDIENCE)
    now = int(time.time())
    token = jwt.encode(
        {"sub": str(uuid.uuid4()), "iss": ISSUER, "aud": AUDIENCE, "iat": now, "exp": now + 60},
        secret,
        algorithm="HS256",
    )

    with pytest.raises(AuthenticationError):
        await verifier.verify(token)


async def test_rejects_garbage(token_verifier: JwtVerifier) -> None:
    with pytest.raises(AuthenticationError):
        await token_verifier.verify("not.a.jwt")


async def test_jwks_resolver_reports_unreachable_provider(make_token: TokenFactory) -> None:
    resolver = JwksKeyResolver("http://127.0.0.1:1/jwks", timeout_seconds=1)

    with pytest.raises(AuthProviderUnavailableError):
        await resolver(make_token(uuid.uuid4()))


async def test_jwks_resolver_rejects_malformed_token() -> None:
    resolver = JwksKeyResolver("http://127.0.0.1:1/jwks", timeout_seconds=1)

    with pytest.raises(AuthenticationError):
        await resolver("garbage")
