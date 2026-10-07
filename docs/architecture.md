# BuildScope architecture

BuildScope is a **modular monolith**: one FastAPI backend, one Next.js frontend, one
PostgreSQL database. Provider integrations (LLMs, research/search) will sit behind
interfaces so they can be swapped without touching business logic.

## Current system (Phase 1)

```text
Browser ──► Next.js (apps/web) ──► FastAPI (apps/api) ──► PostgreSQL
            /dashboard              /health
            /api/health (BFF)       /api/v1/health
```

- **Browser → Next.js only.** The dashboard polls the Next.js route `/api/health`
  every 15 s. That route calls the API server-side using `API_INTERNAL_URL`, validates
  the response with Zod and returns a `connected | unreachable` result. The API's address
  and any future credentials never reach the browser.
- **Liveness vs readiness.** `/health` only proves the process is up (cheap, for probes).
  `/api/v1/health` also runs `SELECT 1` against PostgreSQL with a timeout and returns
  `503` + `"status": "degraded"` when the database is unavailable.
- **Health contract** is defined twice and must stay in sync:
  `apps/api/app/schemas/health.py` (Pydantic) and `packages/shared/src/health.ts` (TypeScript).

## Backend layout (`apps/api/app`)

| Package     | Responsibility                                                    |
| ----------- | ----------------------------------------------------------------- |
| `api/`      | Routers, dependencies (`deps.py`); versioned under `/api/v1`      |
| `core/`     | Settings (`config.py`), structured logging, request-ID middleware |
| `database/` | Async SQLAlchemy engine lifecycle                                 |
| `schemas/`  | Pydantic request/response models                                  |
| `services/` | Business logic, independent of HTTP                               |

Later phases add `models/`, `repositories/`, `agents/`, `research/`, `reports/` and `workers/`.

The app is built by `create_app(settings)`; settings live on `app.state` so tests can build
isolated apps. The database engine is created in the FastAPI lifespan and disposed on shutdown.

## Frontend layout (`apps/web/src`)

| Folder        | Responsibility                                                    |
| ------------- | ----------------------------------------------------------------- |
| `app/`        | Next.js App Router routes and route handlers                      |
| `components/` | Shared UI; `components/ui` holds shadcn/ui primitives             |
| `features/`   | Feature modules (UI + server calls + types), e.g. `system-status` |
| `lib/`        | Utilities and server-only environment parsing                     |

## Logging

The API logs one JSON object per line (`LOG_JSON=true`) with `request_id`, method, path,
status code and duration. Health-check failures log the error _type_ only, because driver
messages can contain connection details.

## Decisions

| Decision                                         | Rationale                                                                                 |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| pnpm workspaces for JS, uv for Python            | Fast, lockfile-based installs; no extra build orchestrator needed yet.                    |
| Async SQLAlchemy + asyncpg                       | Research workloads are I/O-bound; async keeps the API responsive.                         |
| Next.js as backend-for-frontend for API calls    | Keeps the API URL and future secrets server-side; avoids browser CORS.                    |
| `pgvector/pgvector:pg16` image in docker-compose | Vector search can be enabled later without changing images. The extension is not enabled. |
| shadcn/ui components committed as source         | Standard shadcn model; `components.json` lets the CLI add more later.                     |
| Next.js `output: "standalone"`                   | Small production image without the full `node_modules`.                                   |
| Docker images run as a non-root user             | Basic container hardening from day one.                                                   |
