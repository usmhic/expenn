# Expenn — Web

Next.js 16 frontend for the Expenn travel expense workspace. Renders the admin dashboard, traveler portal, and marketing pages. All data is fetched from the [Expenn .NET API](../api/README.md) — there is no separate Next.js API layer.

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 App Router |
| API client | `lib/api-client.ts` → Expenn .NET REST API |
| Auth | JWT cookie (`expenn.token`) set by the .NET API |
| Data / storage | None — no database or object-storage credentials in this app; everything goes through the .NET API |
| Billing | Paddle (subscriptions, webhooks) |
| Docs | Fumadocs MDX at `/docs` |
| UI | shadcn/ui · Tailwind CSS · Recharts |

## Setup

The supported full-stack setup is run from the repository root:

```bash
cp .env.example .env
docker compose up --build web
```

For native web work, run `pnpm install` and `pnpm dev` with the API URLs exported by your shell.

The `.NET API` must be running at `DOTNET_API_URL` before the web app can serve authenticated pages
— it owns the database, file storage, and all auth/email/OAuth config.

### Required environment variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_APP_URL` | Public URL of this web app, e.g. `http://localhost:3000` |
| `DOTNET_API_URL` | Internal URL of the .NET API for server-side SSR calls |
| `NEXT_PUBLIC_DOTNET_API_URL` | Public URL of the .NET API for client-side calls |

Paddle's `PADDLE_API_KEY`, `PADDLE_WEBHOOK_SECRET`, `PADDLE_PRICE_ID`, and `PADDLE_ENVIRONMENT` are optional and should be injected by the deployment platform. Database, auth, email, storage, and SSO configuration belongs to the [.NET API](../api/README.md).

## Auth flow

The web app delegates all authentication to the `.NET API`:

1. Login page POSTs credentials to `DOTNET_API_URL/api/auth/*`
2. On success, the API returns a JWT
3. The web app stores it as an HTTP-only cookie (`expenn.token`)
4. `middleware.ts` reads the cookie on every request, checks the `exp` claim, and redirects expired sessions to `/login`
5. SSR pages pass the cookie to `apiClient({ cookie })` for server-side data fetching

Supported login methods (shown as tabs on `/login`):
- **Email OTP** — passwordless 6-digit code
- **Password** — email + password
- **Active Directory** — corporate LDAP or Azure AD/Entra ID
- **SSO** — generic OIDC (Okta, Auth0, Keycloak, etc.) — button appears automatically when the API reports `oidcEnabled=true`

## API client

```ts
// Server component / server action (SSR)
import { apiClient } from '@/lib/api-client';
import { cookies } from 'next/headers';

const api = apiClient({ cookie: cookies().toString() });
const trips = await api.trips.list({ status: 'active' });

// Client component (uses cookie automatically)
import { api } from '@/lib/api-client';
const summary = await api.expenses.summary();
```

## Routes

| Route | Access | Purpose |
|---|---|---|
| `/` | Public | Marketing / landing |
| `/login` | Public | Sign-in (OTP / Password / AD / SSO) |
| `/register` | Public | Create account |
| `/auth/oidc-callback` | Public | Receives JWT after OIDC redirect |
| `/onboarding` | Authed | Choose personal or company workspace |
| `/checkout` | Authed | Paddle billing |
| `/[workspace]/admin` | admin · manager · owner | Finance dashboard |
| `/[workspace]/admin/trips` | admin · manager · owner | Trip list & creation |
| `/[workspace]/admin/expenses` | admin · manager · owner | Expense review queue |
| `/[workspace]/admin/analytics` | admin · owner | Spend analytics |
| `/[workspace]/admin/settings` | admin · owner | Members, teams, billing |
| `/[workspace]/traveler` | traveler | Personal home & stats |
| `/[workspace]/traveler/expenses` | traveler | Draft and submit expenses |
| `/[workspace]/traveler/documents` | traveler | Document vault |
| `/docs` | Public | Fumadocs help center |

## Roles

| Role | Access |
|---|---|
| `owner` | Full admin — billing, teams, members |
| `admin` | Org-wide trips, expenses, members — no billing |
| `manager` | Their team's trips & expenses only |
| `traveler` | Own expenses, documents, assigned trips |

Free plan: 2 seats (owner + 1). Additional paid members are billed via Paddle.

## Database

This app has no database of its own. The `.NET API` owns the PostgreSQL schema via EF Core
migrations, applied automatically on API startup. See [../api/README.md](../api/README.md).

## Commands

```bash
npm run dev            # start dev server
npm run build          # production build
npm run start          # production start
npm run types:check    # fumadocs-mdx + next typegen + tsc --noEmit
npm run lint           # eslint
```

## Docker

```bash
# Build — NEXT_PUBLIC_DOTNET_API_URL is baked in at build time
docker build \
  --build-arg APP_URL=https://app.expenn.com \
  --build-arg NEXT_PUBLIC_DOTNET_API_URL=https://api.expenn.com \
  -t expenn-web .

# Run — secrets and server-side URLs are injected at container start
docker run -p 3000:3000 \
  -e DOTNET_API_URL=http://expenn-api:8080 \
  -e NEXT_PUBLIC_APP_URL=https://app.expenn.com \
  expenn-web
```
