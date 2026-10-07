"""Runs against a real PostgreSQL. Start one (`make db-up` or a local server), then:

uv run pytest -m integration
"""

import pytest

from app.core.config import Settings
from app.database.session import create_engine
from app.services.health import check_database

pytestmark = pytest.mark.integration


async def test_check_database_ok_against_real_postgres() -> None:
    engine = create_engine(Settings())
    try:
        assert await check_database(engine, timeout_seconds=5) == "ok"
    finally:
        await engine.dispose()
