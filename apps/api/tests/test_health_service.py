from sqlalchemy.ext.asyncio import create_async_engine

from app.core.config import Settings
from app.database.session import create_engine
from app.services.health import build_health, check_database


def test_build_health_is_ok_when_all_checks_pass(settings: Settings) -> None:
    assert build_health(settings, {"database": "ok"}).status == "ok"


def test_build_health_is_degraded_when_any_check_fails(settings: Settings) -> None:
    assert build_health(settings, {"database": "error"}).status == "degraded"


async def test_check_database_ok_against_real_postgres(
    settings: Settings, migrated_database: str
) -> None:
    engine = create_engine(settings)
    try:
        assert await check_database(engine, timeout_seconds=5) == "ok"
    finally:
        await engine.dispose()


async def test_check_database_reports_error_when_unreachable() -> None:
    # Port 1 on localhost is never a PostgreSQL server: the connection is refused quickly.
    engine = create_async_engine("postgresql+asyncpg://u:p@127.0.0.1:1/db")
    try:
        assert await check_database(engine, timeout_seconds=2) == "error"
    finally:
        await engine.dispose()
