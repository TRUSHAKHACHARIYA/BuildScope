"""Bearer-token verification.

Tokens are JWTs issued by the auth provider (Better Auth's JWT plugin today). The API only needs
the provider's public keys, so swapping providers (e.g. Clerk) means pointing `AUTH_JWKS_URL`,
`AUTH_JWT_ISSUER` and `AUTH_JWT_AUDIENCE` elsewhere.
"""

import uuid
from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from typing import Any, Protocol

import anyio
import jwt

# Asymmetric algorithms only: a shared-secret (HS*) token must never be accepted.
ALLOWED_ALGORITHMS = ("EdDSA", "ES256", "RS256")
CLOCK_SKEW_SECONDS = 30


class AuthenticationError(Exception):
    """The token is missing, malformed, expired or not issued for this API."""


class AuthProviderUnavailableError(Exception):
    """The provider's signing keys could not be fetched, so no token can be verified."""


@dataclass(frozen=True, slots=True)
class TokenClaims:
    subject: uuid.UUID


class TokenVerifier(Protocol):
    async def verify(self, token: str) -> TokenClaims: ...


KeyResolver = Callable[[str], Awaitable[Any]]
"""Returns the public key that should verify the given token (chosen by its `kid`)."""


class JwksKeyResolver:
    """Fetches and caches signing keys from a JWKS endpoint."""

    def __init__(self, jwks_url: str, timeout_seconds: float) -> None:
        self._client = jwt.PyJWKClient(
            jwks_url, cache_keys=True, lifespan=300, timeout=timeout_seconds
        )

    async def __call__(self, token: str) -> Any:
        try:
            # PyJWKClient does blocking I/O; keep it off the event loop.
            signing_key = await anyio.to_thread.run_sync(
                self._client.get_signing_key_from_jwt, token
            )
        except jwt.PyJWKClientConnectionError as exc:
            raise AuthProviderUnavailableError from exc
        except (jwt.PyJWKClientError, jwt.DecodeError) as exc:
            raise AuthenticationError("Unknown signing key") from exc
        return signing_key.key


class JwtVerifier:
    def __init__(self, resolve_key: KeyResolver, *, issuer: str, audience: str) -> None:
        self._resolve_key = resolve_key
        self._issuer = issuer
        self._audience = audience

    async def verify(self, token: str) -> TokenClaims:
        key = await self._resolve_key(token)
        try:
            claims = jwt.decode(
                token,
                key,
                algorithms=list(ALLOWED_ALGORITHMS),
                issuer=self._issuer,
                audience=self._audience,
                leeway=CLOCK_SKEW_SECONDS,
                options={"require": ["exp", "iat", "sub", "iss", "aud"]},
            )
        except jwt.InvalidTokenError as exc:
            raise AuthenticationError(type(exc).__name__) from exc

        try:
            subject = uuid.UUID(str(claims["sub"]))
        except ValueError as exc:
            raise AuthenticationError("Invalid subject") from exc
        return TokenClaims(subject=subject)
