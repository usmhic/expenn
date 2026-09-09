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

## Repository structure

```
expenn/
├── api/                              .NET 9 REST API — sole owner of the schema, auth, and rules
│   └── Expenn.Api/
│       ├── Program.cs                Composition root: DI, middleware, startup migration
│       ├── Domain/                   Domain events and exceptions (framework-agnostic)
│       ├── Application/              Cross-cutting primitives — Result<T>, ICurrentUserContext
│       ├── Modules/                  One persistence module per domain + DomainSchemas.cs
│       │   ├── Identity/  Organizations/  Travel/  Expenses/  Documents/
│       ├── Data/
│       │   ├── AppDbContext.cs       Unit of work composing every module's mappings
│       │   ├── Entities/             EF Core entities — the schema
│       │   └── Migrations/           Multi-schema baseline + model snapshot
│       ├── Controllers/              Thin HTTP layer — mapping only, no business logic
│       ├── DTOs/                     Request/response records at the API boundary
│       ├── Services/                 Auth (JWT/OTP/AD), email, storage implementations
│       ├── Infrastructure/           MassTransit wiring, consumers, security middleware
│       └── Configuration/            Strongly-typed settings bound from env vars
│
├── web/                              Next.js App Router client — no database of its own
│   ├── app/
│   │   ├── (home)/                   Public landing, privacy, terms
│   │   ├── (auth)/                   Login and register
│   │   ├── (dashboard)/              Onboarding + /[workspace]/{admin,traveler}/…
│   │   ├── api/                      Route handlers proxying to the .NET API
│   │   ├── docs/                     Fumadocs help center (end-user, not developer docs)
│   │   └── actions.ts                Server actions — the only place the web app mutates
│   ├── components/                   UI, layout, landing, auth, document components
│   ├── content/docs/                 MDX source for the help center
│   ├── lib/                          API client, i18n, Fumadocs source, utilities
│   ├── server/                       Server-only helpers (auth redirects, workspace resolution)
│   └── styles/                       Tailwind layers and design tokens
│
├── mobile/                           Expo Router client — talks to the API with a Bearer token
│   ├── app/                          Screens: (tabs)/, trips/, document/
│   ├── context/                      AuthContext (JWT/OTP/AD/OIDC), ThemeContext
│   ├── lib/                          Typed API client and session storage
│   └── components/                   Shared native UI
│
├── docker-compose.yml                The full local stack: Postgres, MinIO, RabbitMQ, api, web
├── .env                              Local development values — gitignored, ready to run
├── .env.example                      The committed reference for every variable
├── ARCHITECTURE.md                   This file — how the system fits together and why
├── AGENTS.md                         Condensed working map for automated contributors
├── STANDARDS.md                      Repository-wide conventions
├── CONTRIBUTING.md                   How to set up, change, verify, and submit
└── PACKAGE_NAMING.md                 Naming rules for published artifacts
```

Three rules explain most of the layout:

1. **One owner per concern.** The schema, auth, and business rules live only in
   `api/`. `web/` and `mobile/` hold presentation and client-side state.
2. **A module owns a schema.** Everything about the `expenses` domain — entity,
   mapping, schema constant — is reachable from `api/Expenn.Api/Modules/Expenses/`.
3. **Layers point inward.** `Controllers/` depends on `Services/` and `Data/`;
   `Domain/` and `Application/` depend on nothing framework-specific.

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
