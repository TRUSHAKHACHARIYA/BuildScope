from sqlalchemy.ext.asyncio import create_async_engine

from app.core.config import Settings
from app.services.health import build_health, check_database


def test_build_health_is_ok_when_all_checks_pass() -> None:
    health = build_health(Settings(_env_file=None), {"database": "ok"})

    assert health.status == "ok"


def test_build_health_is_degraded_when_any_check_fails() -> None:
    health = build_health(Settings(_env_file=None), {"database": "error"})

    assert health.status == "degraded"


async def test_check_database_reports_error_when_unreachable() -> None:
    # Port 1 on localhost is never a PostgreSQL server: the connection is refused quickly.
    engine = create_async_engine("postgresql+asyncpg://u:p@127.0.0.1:1/db")
    try:
        assert await check_database(engine, timeout_seconds=2) == "error"
    finally:
        await engine.dispose()
