from fastapi import APIRouter, Response, status

from app.api.deps import DatabaseStatusDep, SettingsDep
from app.schemas.health import HealthResponse
from app.services.health import build_health

liveness_router = APIRouter(tags=["health"])
router = APIRouter(tags=["health"])


@liveness_router.get("/health", summary="Liveness probe")
async def liveness(settings: SettingsDep) -> HealthResponse:
    """The process is up. Does not touch dependencies, so it is safe for frequent probes."""
    return build_health(settings, checks={})


@router.get(
    "/health",
    summary="Readiness check including dependencies",
    responses={status.HTTP_503_SERVICE_UNAVAILABLE: {"model": HealthResponse}},
)
async def readiness(
    response: Response, settings: SettingsDep, database: DatabaseStatusDep
) -> HealthResponse:
    health = build_health(settings, checks={"database": database})
    if health.status != "ok":
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    return health
