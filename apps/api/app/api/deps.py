"""Shared FastAPI dependencies."""

from typing import Annotated

from fastapi import Depends, Request
from sqlalchemy.ext.asyncio import AsyncEngine

from app.core.config import Settings
from app.schemas.health import DependencyStatus
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
