"""Maps domain exceptions to HTTP responses."""

import logging

from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse

from app.core.security import AuthenticationError, AuthProviderUnavailableError
from app.services.projects import ProjectNotFoundError

logger = logging.getLogger(__name__)


async def _authentication_error(request: Request, exc: Exception) -> JSONResponse:
    # The reason is logged, not returned: clients get one generic message.
    logger.info("authentication failed", extra={"reason": str(exc)})
    return JSONResponse(
        {"detail": "Not authenticated"},
        status_code=status.HTTP_401_UNAUTHORIZED,
        headers={"WWW-Authenticate": "Bearer"},
    )


async def _auth_provider_unavailable(request: Request, exc: Exception) -> JSONResponse:
    logger.error("auth provider keys unavailable")
    return JSONResponse(
        {"detail": "Authentication is temporarily unavailable"},
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
    )


async def _project_not_found(request: Request, exc: Exception) -> JSONResponse:
    return JSONResponse({"detail": "Project not found"}, status_code=status.HTTP_404_NOT_FOUND)


def register_exception_handlers(app: FastAPI) -> None:
    app.add_exception_handler(AuthenticationError, _authentication_error)
    app.add_exception_handler(AuthProviderUnavailableError, _auth_provider_unavailable)
    app.add_exception_handler(ProjectNotFoundError, _project_not_found)
