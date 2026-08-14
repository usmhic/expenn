# Expenn — .NET Web API

ASP.NET Core 9 Web API. Single backend for the web and mobile apps — handles all auth, business logic, data access, file storage, email, and async messaging.

## Architecture

Expenn is a modular monolith: one deployable API and one public HTTP surface,
with each business domain owning a PostgreSQL schema. Modules communicate
in-process through application services and domain events; clients never address
a module or schema directly. See [MODULES.md](MODULES.md) for ownership,
dependencies, and migration guidance.

## Stack

| Layer | Choice |
|---|---|
| Framework | ASP.NET Core 9 Web API |
| ORM | EF Core 9 + Npgsql (PostgreSQL) |
| Auth | JWT Bearer — Email OTP, Password, AD (LDAP), Azure AD (Entra ID), Generic OIDC |
| Messaging | MassTransit 8 — RabbitMQ in production, in-memory in dev |
| Email | MailKit (SMTP) or Resend HTTP API |
| Storage | MinIO / S3-compatible via AWS SDK |
| API Docs | Swagger / OpenAPI at `/swagger` |
| Architecture | Clean Architecture — Domain / Application / Infrastructure / Controllers |

## Quick start

From the repository root:

```bash
cp .env.example .env
# Fill every empty value in .env before starting Compose.
docker compose up --build api
```

For native API work, start `db`, `minio`, `minio-init`, and `rabbitmq` with Compose, then run `dotnet run --project api/Expenn.Api/Expenn.Api.csproj` with the required ASP.NET Core variables exported by your shell.

On startup the API creates the target database if it doesn't exist yet and applies pending EF Core migrations — in every environment, since this API is the sole owner of the schema. Set `SKIP_MIGRATIONS=true` when a separate migration step/job handles it instead (e.g. to avoid every replica racing to migrate in a multi-instance deployment).

## Environment variables

Double-underscore (`__`) maps to config section nesting: `Jwt__Secret` → `Jwt.Secret`.

The root `.env.example` contains only the required variable names, with
intentionally empty values. Compose maps those concise names to the ASP.NET Core
settings below.

### Minimum required

| Variable | Description |
|---|---|
| `ConnectionStrings__DefaultConnection` | PostgreSQL DSN |
| `Jwt__Secret` | ≥32-char random string (`openssl rand -base64 48`) |
| `Jwt__Issuer` | Token issuer label, e.g. `expenn-api` |
| `Jwt__Audience` | Token audience label, e.g. `expenn-clients` |
| `Cors__AllowedOrigins__0` | Web app origin, e.g. `http://localhost:3000` |

### Optional groups

**Email** — choose one:
```
Email__ResendApiKey=
# or SMTP:
Email__SmtpHost=smtp.example.com
Email__SmtpPort=587
Email__SmtpUser=user@example.com
Email__SmtpPassword=
Email__SmtpSsl=true
```

**File storage** (MinIO / S3):
```
Storage__Endpoint=http://localhost:9000
Storage__PublicUrl=http://localhost:9000
Storage__AccessKey=
Storage__SecretKey=
Storage__Bucket=expenn
Storage__UsePathStyle=true
```

**Active Directory:**
```
ActiveDirectory__Enabled=true
ActiveDirectory__Mode=ldap           # or: azure

# LDAP (on-premises):
ActiveDirectory__LdapHost=dc.corp.example.com
ActiveDirectory__LdapPort=389
ActiveDirectory__LdapBaseDn=DC=corp,DC=example,DC=com
ActiveDirectory__LdapBindDn=CN=svc-expenn,OU=ServiceAccounts,DC=corp,DC=example,DC=com
ActiveDirectory__LdapBindPassword=

# Azure AD / Entra ID:
ActiveDirectory__TenantId=
ActiveDirectory__ClientId=
ActiveDirectory__ClientSecret=
```

**Generic OIDC (Okta, Auth0, Keycloak, Ping, …):**
```
Oidc__Enabled=true
Oidc__ProviderName=Okta
Oidc__Authority=https://your-org.okta.com
Oidc__ClientId=
Oidc__ClientSecret=
Oidc__Scopes=openid email profile
Oidc__WebCallbackUrl=http://localhost:3000/auth/oidc-callback
Oidc__MobileCallbackUrl=expenn://auth/oidc-callback
```

**RabbitMQ / MassTransit:**
```
RabbitMq__Enabled=true               # false = in-memory bus (default)
RabbitMq__Host=localhost
RabbitMq__Port=5672
RabbitMq__VirtualHost=/
RabbitMq__Username=guest
RabbitMq__Password=
```

## API endpoints

All endpoints (except auth) require `Authorization: Bearer <token>`.

### Auth
| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/send-otp` | Send 6-digit OTP to email |
| POST | `/api/auth/verify-otp` | Verify OTP → returns JWT |
| POST | `/api/auth/login` | Email + password → JWT |
| POST | `/api/auth/register` | Create account with password |
| POST | `/api/auth/ad/login` | Active Directory (LDAP or Azure AD) → JWT |
| GET | `/api/auth/oidc/info` | Returns `{ enabled, providerName }` |
| GET | `/api/auth/oidc/login?client=web\|mobile` | Start OIDC browser flow |
| GET | `/api/auth/oidc/callback` | OIDC callback → redirect with JWT |
| GET | `/api/auth/me` | Current user + org context |
| POST | `/api/auth/switch-org` | Re-issue JWT for a different org |
| POST | `/api/auth/logout` | Stateless — client discards token |

All auth flows return:
```json
{ "accessToken": "...", "expiresAt": "2026-08-01T00:00:00Z", "user": { "id": "...", "name": "...", "email": "..." } }
```

### Organizations
| Method | Path | Description |
|---|---|---|
| GET | `/api/organizations` | List the caller's workspaces |
| POST | `/api/organizations` | Create workspace |
| GET | `/api/organizations/{orgId}/members` | List members |
| POST | `/api/organizations/{orgId}/invitations` | Invite member |
| PATCH | `/api/organizations/{orgId}/invitations/{id}` | Accept / decline |
| GET | `/api/organizations/{orgId}/teams` | List teams |
| POST | `/api/organizations/{orgId}/teams` | Create team |
| PUT | `/api/organizations/{orgId}/teams/{teamId}/members` | Assign team members |

### Trips & approvals
| Method | Path | Description |
|---|---|---|
| GET | `/api/trips` | List trips (`?status=&teamId=&mine=true`) |
| POST | `/api/trips` | Create trip |
| GET | `/api/trips/{id}` | Get trip |
| PATCH | `/api/trips/{id}/status` | Update trip status |
| GET | `/api/trips/{id}/travelers` | List travelers |
| PUT | `/api/trips/{id}/travelers` | Assign travelers |
| GET | `/api/trips/approvals` | List travel approvals |
| POST | `/api/trips/{id}/approvals` | Request travel approval |
| PATCH | `/api/trips/approvals/{id}` | Approve / reject |

### Expenses
| Method | Path | Description |
|---|---|---|
| GET | `/api/expenses` | List expenses (`?status=&tripId=&mine=true`) |
| POST | `/api/expenses` | Create expense (draft) |
| GET | `/api/expenses/{id}` | Get expense |
| POST | `/api/expenses/{id}/submit` | Submit draft for review |
| PATCH | `/api/expenses/{id}/review` | Approve / reject / reimburse |
| GET | `/api/expenses/summary` | Counts + totals by status |

### Documents
| Method | Path | Description |
|---|---|---|
| GET | `/api/documents` | List documents |
| POST | `/api/documents` | Upload document (multipart/form-data) |
| GET | `/api/documents/{id}` | Get document |
| DELETE | `/api/documents/{id}` | Soft-delete document |

### Other
| Method | Path | Description |
|---|---|---|
| GET | `/api/comments?tripId=` | Comments for a trip |
| POST | `/api/comments` | Add comment |
| GET | `/api/analytics/overview` | Spend by status + by month |
| GET | `/api/analytics/spend-by-group` | Spend by team |
| POST | `/api/storage/upload` | Upload file → returns URL |
| GET | `/api/search?q=` | Full-text search (trips + expenses) |
| GET | `/api/notifications` | Pending approval / expense counts |
| GET | `/health` | Health check (`{ status, timestamp, environment }`) |

## Architecture overview

```
Expenn.Api/
├── Domain/               Pure domain layer — no external dependencies
│   ├── Events/           Domain event records (ExpenseSubmittedEvent, …)
│   └── Exceptions/       DomainException, NotFoundException, ForbiddenException
│
├── Application/          Orchestration layer
│   └── Common/
│       ├── ICurrentUserContext.cs   JWT claims (userId, orgId, role) as a service
│       ├── CurrentUserContext.cs    Reads from IHttpContextAccessor
│       └── Result.cs                Result<T> — success / failure without throwing
│
├── Infrastructure/       External integrations
│   └── Messaging/
│       ├── RabbitMqSettings.cs
│       ├── MassTransitExtensions.cs   Registers transport (RabbitMQ or in-memory)
│       └── Consumers/                 One file per domain event
│
├── Controllers/          Thin HTTP layer — delegates to services, publishes events
├── Data/                 EF Core DbContext + 15 entity classes
├── Services/             Auth (JWT, OTP, LDAP), Email, Storage
├── Configuration/        Strongly-typed settings classes
└── DTOs/                 Request / response records per controller
```

### Domain events & messaging

Domain events are published with MassTransit's `IPublishEndpoint`:

| Event | Published when | Consumer (default: log + TODO) |
|---|---|---|
| `ExpenseSubmittedEvent` | Expense moves from draft → submitted | Notify managers, sync accounting |
| `ExpenseReviewedEvent` | Expense approved / rejected / reimbursed | Notify submitter, trigger reimbursement |
| `TravelApprovalRequestedEvent` | Traveler requests approval for a trip | Notify managers |
| `TravelApprovalDecidedEvent` | Manager approves / rejects approval | Notify traveler |

Set `RabbitMq__Enabled=false` (default) to run with an in-memory bus — events are still published and consumed in-process, no broker needed. Flip to `true` to go distributed.

Add new consumers in `Infrastructure/Messaging/Consumers/` and register them in `MassTransitExtensions.cs`.

## Docker

```bash
# Build (context is the api/ directory)
docker build -f Expenn.Api/Dockerfile -t expenn-api .

# Run — pass all required env vars at startup
docker run -p 5000:8080 \
  -e ConnectionStrings__DefaultConnection="Host=host.docker.internal;Port=5432;Database=expenn;Username=postgres;Password=postgres" \
  -e Jwt__Secret="your-secret-min-32-chars" \
  -e Jwt__Issuer=expenn-api \
  -e Jwt__Audience=expenn-clients \
  -e Cors__AllowedOrigins__0=http://localhost:3000 \
  expenn-api
```

The container runs as a non-root user (`dotnetuser`, UID 1001) and exposes port `8080`.  
Health check: `GET /health` — returns `200` when the server is ready.

## Connecting the web app

Export these values when running the web app outside Compose:
```
DOTNET_API_URL=http://localhost:5000
NEXT_PUBLIC_DOTNET_API_URL=http://localhost:5000
```

```ts
// Server component (SSR)
import { apiClient } from '@/lib/api-client';
import { cookies } from 'next/headers';
const api = apiClient({ cookie: cookies().toString() });
const trips = await api.trips.list();

// Client component
import { api } from '@/lib/api-client';
const expenses = await api.expenses.list({ mine: true });
```

## Connecting the mobile app

Export this value when starting Expo:
```
EXPO_PUBLIC_API_URL=http://192.168.1.x:5000   # use LAN IP for physical devices
```

```ts
import { trips, auth } from '@/lib/api';
const result = await auth.sendOtp({ email: 'user@example.com' });
```
