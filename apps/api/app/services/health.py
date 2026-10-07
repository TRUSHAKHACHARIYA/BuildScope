"""Health checks for the API and its dependencies."""

import asyncio
import logging
from datetime import UTC, datetime

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine

from app.core.config import Settings
from app.schemas.health import DependencyStatus, HealthResponse

logger = logging.getLogger(__name__)


async def check_database(engine: AsyncEngine, timeout_seconds: float) -> DependencyStatus:
    try:
        async with asyncio.timeout(timeout_seconds):
            async with engine.connect() as connection:
                await connection.execute(text("SELECT 1"))
    except Exception as exc:
        # Log the error type only: driver messages can include connection details.
        logger.warning("database health check failed", extra={"error_type": type(exc).__name__})
        return "error"
    return "ok"


def build_health(settings: Settings, checks: dict[str, DependencyStatus]) -> HealthResponse:
    return HealthResponse(
        status="ok" if all(status == "ok" for status in checks.values()) else "degraded",
        service=settings.app_name,
        version=settings.app_version,
        environment=settings.environment,
        timestamp=datetime.now(UTC),
        checks=checks,
    )
