# Architecture

This document explains *why* expenn is organized the way it is. For *how* to work inside a
specific app, see its nested README (`api/README.md`, `web/README.md`, `mobile/README.md`).

## Overview

```
                     ┌──────────────┐
                     │   Postgres   │
                     └──────┬───────┘
                            │ EF Core (sole schema owner)
                     ┌──────┴───────┐        ┌────────────┐
   web / mobile ───► │  .NET API    │◄──────►│  RabbitMQ  │ (optional, in-memory fallback)
   (REST + JWT)      └──────┬───────┘        └────────────┘
                            │
                     ┌──────┴───────┐
                     │    MinIO     │  (S3-compatible object storage)
                     └──────────────┘
```

- **`api/`** is the single source of truth for data, auth, and business logic. It owns the
  Postgres schema (via EF Core migrations), issues JWTs, talks to MinIO for file storage, and
  optionally publishes domain events over RabbitMQ (MassTransit falls back to an in-memory
  transport when RabbitMQ is disabled, so it's not a hard dependency in dev).
- **`web/`** and **`mobile/`** are thin clients. Neither has its own database or storage
  credentials — every read/write goes through the API's REST endpoints over HTTP, authenticated
  with the JWT the API issues. This was a deliberate simplification: earlier revisions of this
  repo had a Next.js API layer with its own Drizzle-managed schema and Better Auth session
  handling; that layer was removed so there is exactly one place that owns data and auth.

## Modular monolith and schemas

The API is one deployable and one public contract, but persistence is divided
into five domain-owned schemas: `identity`, `organizations`, `travel`,
`expenses`, and `documents`. The complete ownership and dependency map lives in
[`api/MODULES.md`](./api/MODULES.md).

`AppDbContext` composes one persistence configuration per module. Controllers
continue to expose a unified REST surface; synchronous workflows remain
in-process and domain events use MassTransit where asynchronous decoupling is
useful. Cross-schema foreign keys preserve integrity and document dependencies
that would need contracts if a module becomes an independent service.

## Directory purposes

| Directory | Responsibility |
|---|---|
| `api/Expenn.Api/Domain/` | Domain events and exceptions — the vocabulary of the business logic, framework-agnostic |
| `api/Expenn.Api/Application/` | Cross-cutting application primitives (`Result<T>`, `ICurrentUserContext`) |
| `api/Expenn.Api/Infrastructure/` | MassTransit/RabbitMQ wiring and consumers — the messaging plumbing |
| `api/Expenn.Api/Modules/` | Domain persistence modules and schema ownership constants |
| `api/Expenn.Api/Controllers/` | Thin HTTP layer — request/response mapping only, no business logic |
| `api/Expenn.Api/Data/` | EF Core unit of work, entities, and the composed baseline migration |
| `api/Expenn.Api/Services/` | Auth, email, and storage implementations |
| `api/Expenn.Api/Configuration/` | Strongly-typed settings bound from environment variables |
| `api/Expenn.Api/DTOs/` | Request/response records exposed at the API boundary |
| `web/app/` | Next.js App Router pages and route groups |
| `web/lib/` | API client, auth helpers, and other client-side utilities |
| `web/content/docs/` | Fumadocs MDX source for the in-product help center (end-user docs, not developer docs) |
| `mobile/app/` | Expo Router screens |
| `mobile/context/` | React context providers, notably `AuthContext` for JWT/OTP/AD/OIDC state |
| `mobile/lib/` | Typed API client shared across screens |
| `ARCHITECTURE.md` | This file — engineering-facing architecture documentation |

## Data flow

1. A client (web or mobile) calls a `.NET API` REST endpoint, attaching a JWT once authenticated.
2. The API's controller layer validates the request, delegates to services/EF Core, and returns a
   DTO.
3. State-changing operations may publish a domain event (e.g. `TripApprovedEvent`), consumed
   in-process or over RabbitMQ depending on `RabbitMq__Enabled`.
4. File uploads go through the API, which proxies to MinIO/S3 rather than letting clients talk to
   storage directly — this keeps access-control decisions in one place.

## Database startup

On every boot (unless `SKIP_MIGRATIONS=true`), `Program.cs` runs two steps before accepting
requests:

1. `DatabaseInitializer.EnsureDatabaseCreatedAsync` (`api/Expenn.Api/Infrastructure/Database/`)
   connects to Postgres's `postgres` maintenance database, checks `pg_database` for the target
   database, and issues `CREATE DATABASE` if it's missing. This exists because EF Core's
   `Database.Migrate()` does not reliably create the database itself on the Npgsql provider
   (unlike SQL Server/SQLite) — without this step, pointing the API at a bare Postgres server
   would throw instead of self-provisioning.
2. `ctx.Database.Migrate()` applies the multi-schema baseline, tracked in the standard
   `__EFMigrationsHistory` table. Fresh databases are created directly in domain schemas;
   legacy public tables are copied transactionally with identifiers and relationships intact.

Set `SKIP_MIGRATIONS=true` to skip both steps (e.g. to avoid every replica racing to
create/migrate in a multi-instance deployment, when a separate job owns that instead).

## Key design decisions

- **API-owns-everything**: no client has direct database or storage access. This makes it possible
  to add new clients (or swap web/mobile frameworks) without duplicating auth or data logic.
- **Schema-per-domain**: each module owns its PostgreSQL schema and EF mappings,
  while one `DbContext` preserves straightforward transactions and deployment.
- **In-memory messaging fallback**: RabbitMQ is optional in development so contributors don't need
  to run a broker just to exercise domain-event-driven code paths.
- **Environment-variable configuration**: required local values live in the repository-root `.env`
  and are mapped into ASP.NET Core's `Section__Key` variables by Compose. Optional integrations are
  injected directly by the deployment platform.
