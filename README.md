# BuildScope

AI-powered project discovery and product intelligence. A user describes a project; BuildScope
researches the market and competitors and produces an evidence-backed discovery report.

> **Status:** Phase 2 — accounts (sign-up, sign-in, sessions), database migrations and
> owner-scoped project management. Discovery research lands in later phases.

## Repository layout

```text
apps/
  api/              FastAPI backend (Python 3.12+, uv)
  web/              Next.js 16 frontend (TypeScript, Tailwind CSS v4, shadcn/ui)
packages/
  shared/           TypeScript contracts shared across JS apps (@buildscope/shared)
  config/           Shared TypeScript config (@buildscope/config)
tests/
  e2e/              Playwright end-to-end tests (@buildscope/e2e)
infra/docker/       Dockerfiles (dev + production targets)
docs/               Architecture notes and decisions
docker-compose.yml  Local stack: postgres, api, web
Makefile            Developer commands (`make help`)
```

## Prerequisites

- Node.js 22+ and pnpm 10 (`corepack enable`)
- Python 3.12+ and [uv](https://docs.astral.sh/uv/)
- Docker with Compose v2 (for the containerised stack or a throwaway PostgreSQL)

## Quick start (Docker)

```bash
cp .env.example .env
# Set BETTER_AUTH_SECRET in .env, e.g. to the output of: openssl rand -base64 32
make up            # docker compose up --build (the API applies migrations on start)
```

- Web: http://localhost:3000 — create an account at `/signup`
- API: http://localhost:8000 — interactive docs at http://localhost:8000/docs

## Local development (without Docker for the apps)

```bash
make install       # pnpm install + uv sync
cp .env.example .env   # then set BETTER_AUTH_SECRET
make db-up         # PostgreSQL in Docker (or point DATABASE_URL at your own server)
make dev-api       # terminal 1: applies migrations, then FastAPI on :8000 with auto-reload
make dev-web       # terminal 2: Next.js on :3000 with hot reload
```

The web app reads the root `.env` too, so one file configures everything.

## Database migrations

Alembic (in `apps/api`) owns **every** table, including the auth tables Better Auth uses.

| Command                        | What it does                                  |
| ------------------------------ | --------------------------------------------- |
| `make migrate`                 | Apply all pending migrations                  |
| `make migration m="add thing"` | Generate a migration from model changes       |
| `make migrate-down`            | Roll back the latest migration                |
| `make migrate-check`           | Fail if models and migrations are out of sync |

Never change the database schema by hand: add a migration.

## Quality checks

| Command                     | What it does                                        |
| --------------------------- | --------------------------------------------------- |
| `make check`                | Lint + type-check + unit tests for everything       |
| `make lint`                 | Ruff (API), ESLint + Prettier check (web)           |
| `make typecheck`            | MyPy strict (API), `tsc` (web, shared, e2e)         |
| `make test`                 | pytest (API) + Vitest (web)                         |
| `make test-api-integration` | pytest against a real PostgreSQL (`DATABASE_URL`)   |
| `make e2e`                  | Playwright against a running stack (`E2E_BASE_URL`) |
| `make format`               | Ruff format/fix + Prettier write                    |
| `make build`                | Production build of the web app                     |

API tests need PostgreSQL: they create and migrate `TEST_DATABASE_URL` (default
`buildscope_test`, so the database user needs `CREATEDB`) and roll back each test.

E2E tests sign up many users quickly, so start the web app with `AUTH_RATE_LIMIT_ENABLED=false`
for E2E runs only. First E2E run: `pnpm --filter @buildscope/e2e exec playwright install chromium`
(or set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` to an existing Chromium).

## API endpoints

| Method | Path             | Purpose                                                              |
| ------ | ---------------- | -------------------------------------------------------------------- |
| GET    | `/health`        | Liveness — process is up; never touches dependencies                 |
| GET    | `/api/v1/health` | Readiness — includes a database check; `503` if a dependency is down |

Every response carries an `X-Request-ID` header (a valid incoming one is echoed, otherwise
generated) and each request is logged with method, path, status and duration.

## Environment variables

All variables are documented in [`.env.example`](.env.example). Copy it to `.env`;
**never commit `.env`**. Web variables are server-side only — the browser talks to the
Next.js server, which calls the API, so no API URL, token or secret reaches the client.
`BETTER_AUTH_SECRET` is required at runtime but not at build time.

## Git workflow

`main` ← `develop` ← `feature/*`. Never commit directly to `main`.
Commit messages use `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`.

## Further reading

- [docs/architecture.md](docs/architecture.md) — architecture and recorded decisions
