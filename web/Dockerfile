# syntax=docker/dockerfile:1

FROM node:24-alpine AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
RUN corepack enable

# ── Install dependencies ───────────────────────────────────────────────────────
FROM base AS deps
COPY --link package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --ignore-scripts

# ── Build ─────────────────────────────────────────────────────────────────────
FROM base AS builder

# NEXT_PUBLIC_* vars are inlined at build time — everything else is runtime-only.
# hadolint ignore=DL3044
ARG APP_URL=http://localhost:3000
# hadolint ignore=DL3044
ARG NEXT_PUBLIC_DOTNET_API_URL=http://localhost:5000

# NEXT_PUBLIC_APP_URL is used in client-side links.
# NEXT_PUBLIC_DOTNET_API_URL is used in client components that call the .NET API.
# hadolint ignore=DL3044
ENV NEXT_PUBLIC_APP_URL=$APP_URL \
    NEXT_PUBLIC_DOTNET_API_URL=$NEXT_PUBLIC_DOTNET_API_URL

COPY --link --from=deps /app/node_modules ./node_modules
COPY --link . .

RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm run build && rm -f .next/standalone/.env

# ── Production runner ─────────────────────────────────────────────────────────
FROM node:24-alpine AS runner
WORKDIR /app

LABEL org.opencontainers.image.title="expenn-web" \
      org.opencontainers.image.source="https://github.com/usmhic/expenn" \
      org.opencontainers.image.description="Expenn web app (Next.js)" \
      org.opencontainers.image.authors="usmhic" \
      org.opencontainers.image.licenses="MIT"

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# Create a non-root user before copying any files.
RUN apk add --no-cache curl \
 && addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 --ingroup nodejs nextjs

# Next.js standalone output
COPY --link --from=builder /app/public ./public
COPY --link --from=builder --chown=1001:1001 /app/.next/standalone ./
COPY --link --from=builder --chown=1001:1001 /app/.next/static     ./.next/static

# ── Runtime configuration ─────────────────────────────────────────────────────
# Secrets and connection strings are injected at container-start via env vars.
# This app has no database or object-storage credentials of its own — it only
# talks to the .NET API. Required at runtime:
#   DOTNET_API_URL         Internal URL of the .NET API (server-side SSR calls)
#
# See the repository-root .env.example and service READMEs. Database, auth,
# email, storage, and OAuth/SSO config all live on the .NET API.

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD curl -fsS http://localhost:3000/api/health || exit 1

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
