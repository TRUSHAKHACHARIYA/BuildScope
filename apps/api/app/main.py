"""FastAPI application factory."""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.errors import register_exception_handlers
from app.api.router import api_router
from app.api.routes.health import liveness_router
from app.core.config import Settings, get_settings
from app.core.logging import configure_logging
from app.core.middleware import REQUEST_ID_HEADER, RequestContextMiddleware
from app.core.security import JwksKeyResolver, JwtVerifier, TokenVerifier
from app.database.session import create_engine, create_session_factory

API_V1_PREFIX = "/api/v1"


def create_token_verifier(settings: Settings) -> TokenVerifier:
    return JwtVerifier(
        JwksKeyResolver(settings.auth_jwks_url, settings.auth_jwks_timeout_seconds),
        issuer=settings.auth_jwt_issuer,
        audience=settings.auth_jwt_audience,
    )


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()
    configure_logging(settings.log_level, json_output=settings.log_json)

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        app.state.engine = create_engine(settings)
        app.state.session_factory = create_session_factory(app.state.engine)
        try:
            yield
        finally:
            await app.state.engine.dispose()

    app = FastAPI(
        title="BuildScope API",
        version=settings.app_version,
        lifespan=lifespan,
        docs_url=None if settings.environment == "production" else "/docs",
        redoc_url=None,
    )
    app.state.settings = settings
    app.state.token_verifier = create_token_verifier(settings)
    register_exception_handlers(app)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=[REQUEST_ID_HEADER],
    )
    app.add_middleware(RequestContextMiddleware)

    app.include_router(liveness_router)
    app.include_router(api_router, prefix=API_V1_PREFIX)
    return app


app = create_app()
