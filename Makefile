# BuildScope developer commands. Run `make help` for the list.
SHELL := /bin/bash
API_DIR := apps/api
UV := cd $(API_DIR) && uv run

.DEFAULT_GOAL := help

.PHONY: help
help: ## Show available commands
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-22s\033[0m %s\n", $$1, $$2}'

# --- Setup -------------------------------------------------------------------
.PHONY: install
install: ## Install all JS and Python dependencies
	pnpm install
	cd $(API_DIR) && uv sync

.env:
	cp .env.example .env

# --- Running -----------------------------------------------------------------
.PHONY: up down logs db-up
up: .env ## Start the full stack in Docker (postgres, api, web)
	docker compose up --build

down: ## Stop the Docker stack
	docker compose down

logs: ## Follow Docker stack logs
	docker compose logs -f

db-up: .env ## Start only PostgreSQL in Docker
	docker compose up -d postgres

.PHONY: dev-api dev-web
dev-api: .env ## Run the API locally with auto-reload (needs PostgreSQL)
	$(UV) uvicorn app.main:app --reload --port 8000

dev-web: ## Run the web app locally with hot reload
	pnpm --filter @buildscope/web dev

# --- Quality -----------------------------------------------------------------
.PHONY: lint lint-api lint-web
lint: lint-api lint-web ## Lint everything

lint-api:
	$(UV) ruff check .
	$(UV) ruff format --check .

lint-web:
	pnpm lint
	pnpm format:check

.PHONY: format
format: ## Auto-format all code
	$(UV) ruff format .
	$(UV) ruff check --fix .
	pnpm format

.PHONY: typecheck typecheck-api typecheck-web
typecheck: typecheck-api typecheck-web ## Type-check everything

typecheck-api:
	$(UV) mypy

typecheck-web:
	pnpm typecheck

.PHONY: test test-api test-api-integration test-web e2e
test: test-api test-web ## Run unit tests (API + web)

test-api: ## Run API unit tests
	$(UV) pytest

test-api-integration: ## Run API integration tests (needs PostgreSQL)
	$(UV) pytest -m integration

test-web: ## Run web unit tests
	pnpm --filter @buildscope/web test

e2e: ## Run Playwright E2E tests against a running stack
	pnpm --filter @buildscope/e2e e2e

.PHONY: build
build: ## Production build of the web app
	pnpm --filter @buildscope/web build

.PHONY: check
check: lint typecheck test ## Lint, type-check and unit-test everything
