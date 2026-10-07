"""Shared FastAPI dependencies."""

from collections.abc import AsyncIterator
from typing import Annotated

from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker

from app.core.config import Settings
from app.core.security import AuthenticationError, TokenVerifier
from app.models.auth import User
from app.schemas.health import DependencyStatus
from app.schemas.user import CurrentUser
from app.services.health import check_database


def get_app_settings(request: Request) -> Settings:
    settings: Settings = request.app.state.settings
    return settings


SettingsDep = Annotated[Settings, Depends(get_app_settings)]


def get_engine(request: Request) -> AsyncEngine:
    engine: AsyncEngine = request.app.state.engine
    return engine


async def get_database_status(
    settings: SettingsDep, engine: Annotated[AsyncEngine, Depends(get_engine)]
) -> DependencyStatus:
    return await check_database(engine, settings.database_connect_timeout_seconds)


DatabaseStatusDep = Annotated[DependencyStatus, Depends(get_database_status)]


async def get_db_session(request: Request) -> AsyncIterator[AsyncSession]:
    session_factory: async_sessionmaker[AsyncSession] = request.app.state.session_factory
    async with session_factory() as session:
        yield session


DbSessionDep = Annotated[AsyncSession, Depends(get_db_session)]


def get_token_verifier(request: Request) -> TokenVerifier:
    verifier: TokenVerifier = request.app.state.token_verifier
    return verifier


_bearer = HTTPBearer(auto_error=False, description="JWT issued by BuildScope auth")


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
    verifier: Annotated[TokenVerifier, Depends(get_token_verifier)],
    session: DbSessionDep,
) -> CurrentUser:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise AuthenticationError("Missing bearer token")
    claims = await verifier.verify(credentials.credentials)
    user = await session.get(User, claims.subject)
    if user is None:
        raise AuthenticationError("Unknown user")
    return CurrentUser.model_validate(user)


CurrentUserDep = Annotated[CurrentUser, Depends(get_current_user)]
