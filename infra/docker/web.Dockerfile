# syntax=docker/dockerfile:1.7
# BuildScope web image. Build context: repository root (pnpm workspace)
#   docker build -f infra/docker/web.Dockerfile --target runtime .

FROM node:22-alpine AS base
ENV PNPM_HOME=/pnpm \
    PATH="/pnpm:$PATH" \
    NEXT_TELEMETRY_DISABLED=1
RUN corepack enable
WORKDIR /repo

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
COPY packages/config/package.json packages/config/
COPY tests/e2e/package.json tests/e2e/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --filter @buildscope/web...

# Development: source is bind-mounted by docker-compose, hot reload via `next dev`.
FROM deps AS dev
COPY packages packages
COPY apps/web apps/web
WORKDIR /repo/apps/web
EXPOSE 3000
CMD ["pnpm", "dev", "--hostname", "0.0.0.0"]

FROM deps AS build
COPY packages packages
COPY apps/web apps/web
RUN pnpm --filter @buildscope/web build

FROM node:22-alpine AS runtime
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000
WORKDIR /app
RUN addgroup -S -g 10001 buildscope && adduser -S -u 10001 -G buildscope buildscope
COPY --from=build --chown=buildscope:buildscope /repo/apps/web/.next/standalone ./
COPY --from=build --chown=buildscope:buildscope /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=buildscope:buildscope /repo/apps/web/public ./apps/web/public
USER buildscope
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
