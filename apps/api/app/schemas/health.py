"""Health contracts. Keep in sync with `packages/shared/src/health.ts`."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel

ServiceStatus = Literal["ok", "degraded", "error"]
DependencyStatus = Literal["ok", "error"]


class HealthResponse(BaseModel):
    status: ServiceStatus
    service: str
    version: str
    environment: str
    timestamp: datetime
    checks: dict[str, DependencyStatus]
