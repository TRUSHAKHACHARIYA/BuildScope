"""Shared fixtures.

Database tests run against a real PostgreSQL: `TEST_DATABASE_URL`, default local `buildscope_test`.
The database is created if missing and migrated once per session; every test runs inside a
transaction that is rolled back, so tests are isolated and leave no data behind.
"""

import asyncio
import os
import time
import uuid
from collections.abc import AsyncIterator, Awaitable, Callable, Iterator
from typing import Any

import httpx2
import jwt
import pytest
from alembic import command
from alembic.config import Config
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import make_url, text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.pool import NullPool

from app.api.deps import get_database_status, get_db_session, get_token_verifier
from app.core.config import Settings
from app.core.security import JwtVerifier
from app.main import create_app
from app.models.auth import User
from app.schemas.health import DependencyStatus

TEST_DATABASE_URL = os.environ.get(
    "TEST_DATABASE_URL",
    "postgresql+asyncpg://buildscope:buildscope@localhost:5432/buildscope_test",
)
ISSUER = "http://auth.test"
AUDIENCE = "buildscope-api"
API_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


# --- Settings / app ----------------------------------------------------------------------------


@pytest.fixture
def settings() -> Settings:
    return Settings(
        _env_file=None,
        environment="test",
        log_json=False,
        database_url=TEST_DATABASE_URL,
        auth_jwt_issuer=ISSUER,
        auth_jwt_audience=AUDIENCE,
    )


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


# --- Database ----------------------------------------------------------------------------------


async def _ensure_database(url: str) -> None:
    target = make_url(url)
    admin = create_async_engine(
        target.set(database="postgres"), poolclass=NullPool, isolation_level="AUTOCOMMIT"
    )
    try:
        async with admin.connect() as connection:
            exists = await connection.scalar(
                text("SELECT 1 FROM pg_database WHERE datname = :name"),
                {"name": target.database},
            )
            if not exists:
                await connection.execute(text(f'CREATE DATABASE "{target.database}"'))
    finally:
        await admin.dispose()


@pytest.fixture(scope="session")
def migrated_database() -> str:
    asyncio.run(_ensure_database(TEST_DATABASE_URL))
    config = Config(os.path.join(API_ROOT, "alembic.ini"))
    config.set_main_option("script_location", os.path.join(API_ROOT, "migrations"))
    config.set_main_option("sqlalchemy.url", TEST_DATABASE_URL)
    config.attributes["configure_logger"] = False
    command.downgrade(config, "base")
    command.upgrade(config, "head")
    return TEST_DATABASE_URL


@pytest.fixture
async def db_session(migrated_database: str) -> AsyncIterator[AsyncSession]:
    engine = create_async_engine(migrated_database, poolclass=NullPool)
    connection = await engine.connect()
    transaction = await connection.begin()
    session = AsyncSession(
        bind=connection, join_transaction_mode="create_savepoint", expire_on_commit=False
    )
    try:
        yield session
    finally:
        await session.close()
        await transaction.rollback()
        await connection.close()
        await engine.dispose()


UserFactory = Callable[..., Awaitable[User]]


@pytest.fixture
def make_user(db_session: AsyncSession) -> UserFactory:
    async def _make_user(name: str = "Ada Lovelace", email: str | None = None) -> User:
        user = User(
            name=name,
            email=email or f"user-{uuid.uuid4().hex[:8]}@example.com",
            email_verified=False,
        )
        db_session.add(user)
        await db_session.flush()
        return user

    return _make_user


# --- Auth --------------------------------------------------------------------------------------


@pytest.fixture(scope="session")
def signing_key() -> Ed25519PrivateKey:
    return Ed25519PrivateKey.generate()


TokenFactory = Callable[..., str]


@pytest.fixture
def make_token(signing_key: Ed25519PrivateKey) -> TokenFactory:
    def _make_token(subject: uuid.UUID | str, **overrides: Any) -> str:
        now = int(time.time())
        claims: dict[str, Any] = {
            "sub": str(subject),
            "iss": ISSUER,
            "aud": AUDIENCE,
            "iat": now,
            "exp": now + 900,
        }
        claims.update(overrides)
        claims = {key: value for key, value in claims.items() if value is not None}
        return jwt.encode(claims, signing_key, algorithm="EdDSA")

    return _make_token


@pytest.fixture
def token_verifier(signing_key: Ed25519PrivateKey) -> JwtVerifier:
    public_key = signing_key.public_key()

    async def resolve(_token: str) -> Any:
        return public_key

    return JwtVerifier(resolve, issuer=ISSUER, audience=AUDIENCE)


@pytest.fixture
async def api(
    app: FastAPI, db_session: AsyncSession, token_verifier: JwtVerifier
) -> AsyncIterator[httpx2.AsyncClient]:
    async def _session() -> AsyncIterator[AsyncSession]:
        yield db_session

    app.dependency_overrides[get_db_session] = _session
    app.dependency_overrides[get_token_verifier] = lambda: token_verifier
    transport = httpx2.ASGITransport(app=app)
    async with httpx2.AsyncClient(transport=transport, base_url="http://test") as http:
        yield http


def bearer(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}
