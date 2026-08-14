# API modules and database schemas

Expenn is a modular monolith: web and mobile use one .NET API, while each domain
owns a PostgreSQL schema and a persistence configuration module. The design has
microservice-style boundaries without premature network calls or distributed
transactions.

## Ownership map

| Module | PostgreSQL schema | Owned tables | Depends on |
|---|---|---|---|
| Identity | `identity` | `user`, `session`, `account`, `verification` | — |
| Organizations | `organizations` | `organization`, `member`, `invitation`, `team`, `team_member` | Identity |
| Travel | `travel` | `trips`, `trip_traveler`, `travel_approvals` | Identity, Organizations |
| Expenses | `expenses` | `expenses`, `expense_comment` | Identity, Organizations, Travel |
| Documents | `documents` | `documents` | Identity, Organizations, Travel |

`Modules/DomainSchemas.cs` is the source of truth for schema names. Each
`Modules/<Domain>/*Persistence.cs` file owns its EF Core mappings, indexes, and
relationships. `AppDbContext` composes those modules into one unit of work.

## Internal communication

- Controllers remain the single HTTP boundary and preserve the unified routes.
  Clients never address schemas or modules directly.
- Synchronous workflows call application/domain services in-process and can use
  one EF Core transaction across modules when consistency requires it.
- State changes may publish domain events. MassTransit uses RabbitMQ when
  enabled and an in-memory transport during local development.
- A module owns writes to its tables. New cross-module behavior should depend on
  a service or event contract, not another module's persistence implementation.
- Cross-schema foreign keys intentionally protect integrity while all modules
  share one database. They identify the dependencies that must be replaced by
  contracts if a module is extracted later.

## Fresh baseline and existing data

`Data/Migrations/20260814000000_MultiSchemaBaseline.cs` is the only maintained
EF Core migration. On a fresh database it creates every schema and table. On a
legacy database it moves the public tables into a temporary `legacy` schema,
creates the domain-owned tables, copies rows in dependency order, then removes
the temporary schema. The work runs inside the migration transaction.

Before upgrading an existing database:

1. Stop API writers and take a verified PostgreSQL backup.
2. Record row counts for all application tables in `public`.
3. Start one API instance with migrations enabled.
4. Confirm the new schemas, row counts, relationships, and API smoke tests.
5. Start remaining replicas only after verification.

The migration collapses pre-public EF history to the new baseline after the data
copy succeeds. Never run multiple migration-owning replicas concurrently.
