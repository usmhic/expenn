<div align="center">

# 🧾 Expenn

### Receipts in, reimbursements out.

**Self-hosted expense and travel management for teams.**
Snap a receipt on the road, log it against a trip, submit it when you land —
and let finance approve the whole thing from one dashboard. No spreadsheet
graveyards, no shoebox of crumpled receipts.

<br />

[![Live demo](https://img.shields.io/badge/▶_Live_demo-expenn.osas.cloud-4F8EF7?style=for-the-badge&labelColor=0A0A0F)](https://expenn.osas.cloud)
[![API](https://img.shields.io/badge/⚙_Live_API-api.expenn.osas.cloud-4F8EF7?style=for-the-badge&labelColor=0A0A0F)](https://api.expenn.osas.cloud)
[![Docs](https://img.shields.io/badge/📖_Help_center-Read_the_docs-4F8EF7?style=for-the-badge&labelColor=0A0A0F)](https://expenn.osas.cloud/docs)

[![iOS](https://img.shields.io/badge/iOS-Coming_soon-0A0A0F?style=for-the-badge&logo=apple&logoColor=white)](#mobile-apps)
[![Android](https://img.shields.io/badge/Android-Coming_soon-0A0A0F?style=for-the-badge&logo=android&logoColor=white)](#mobile-apps)

<br />

[![API CI](https://github.com/usmhic/expenn/actions/workflows/api-ci.yml/badge.svg)](https://github.com/usmhic/expenn/actions/workflows/api-ci.yml)
[![Web CI](https://github.com/usmhic/expenn/actions/workflows/web-ci.yml/badge.svg)](https://github.com/usmhic/expenn/actions/workflows/web-ci.yml)
[![Android CI](https://github.com/usmhic/expenn/actions/workflows/mobile-android-dev.yml/badge.svg)](https://github.com/usmhic/expenn/actions/workflows/mobile-android-dev.yml)
[![iOS CI](https://github.com/usmhic/expenn/actions/workflows/mobile-ios-release.yml/badge.svg)](https://github.com/usmhic/expenn/actions/workflows/mobile-ios-release.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

<sub>.NET 9 · ASP.NET Core · Next.js · Expo · PostgreSQL · RabbitMQ · MinIO · one <code>docker compose up</code></sub>

</div>

---

## 🎬 Try the demo

| Where | Link | What you'll see |
|---|---|---|
| 🌍 **Web app** | **[expenn.osas.cloud](https://expenn.osas.cloud)** | Workspaces, trips, the expense review queue, and the document vault |
| ⚙️ **API** | **[api.expenn.osas.cloud](https://api.expenn.osas.cloud)** | The live .NET API the web and mobile clients talk to |
| 📖 **Help center** | **[expenn.osas.cloud/docs](https://expenn.osas.cloud/docs)** | End-user guides: getting started, trips, expenses, documents, mobile |

> 💡 **Sign-in is passwordless.** Enter an email, get a one-time code, and you're in — then pick a
> personal account or a company workspace. Self-hosting the stack gives you both sides of the flow
> (traveler *and* approver) on your own machine in a couple of minutes.

## ✨ Two sides, one flow

**For travelers** 🎒 — capture receipts on the go, log expenses against a trip, store passports
and itineraries in the document vault, and submit for reimbursement when you're back.

**For finance and admins** 📊 — create and assign trips, review submitted expenses, approve or
reject with a note, and track team spend across every trip from one dashboard.

```
capture ──▶ log against a trip ──▶ submit ──▶ review ──▶ approve ──▶ reimburse
  📸              🧳                  📤          👀         ✅          💸
```

## 🗺️ What's inside

| | Surface | Highlights |
|---|---|---|
| 🌍 | **Web** | Workspace dashboards, trip management, the review queue, Fumadocs help center |
| 🎒 | **Traveler** | Personal expense log, trip view, document vault, reimbursement status |
| 📱 | **Mobile** | Expo app with OTP sign-in, camera receipt capture, biometrics, offline-first sync |
| ⚙️ | **API** | .NET 9 API — owns auth, roles, business rules, and the PostgreSQL schema |
| 📬 | **Async** | MassTransit over RabbitMQ for background work and notifications |
| 📦 | **Storage** | MinIO (S3-compatible) for receipts and travel documents |

## 🧱 Tech stack

| Surface | Stack |
| --- | --- |
| API | .NET 9, ASP.NET Core, EF Core, PostgreSQL, MassTransit |
| Web | Next.js, React, TypeScript, Fumadocs |
| Mobile | Expo, React Native, Fastlane |
| Infrastructure | MinIO, RabbitMQ, Docker Compose |
| Delivery | GitHub Actions, GHCR, Play Console, TestFlight |

## 🚀 Quick start

Docker Compose is the supported full-stack development path. It starts PostgreSQL, MinIO,
RabbitMQ, the API, and the web app, and creates the object-storage bucket automatically.

```bash
git clone https://github.com/usmhic/expenn.git && cd expenn
cp .env.example .env       # PowerShell: Copy-Item .env.example .env
# Fill the secrets marked FILL ME at the bottom of .env, then:
docker compose up --build
```

`.env.example` already carries working localhost defaults for everything that is not a secret, so
the only values you need to invent are the passwords and the JWT secret. `.env` is gitignored;
never commit it.

☕ Grab a coffee for the first build, then open:

| Service | URL |
|---|---|
| 🌍 Web | http://localhost:3000 |
| ⚙️ API | http://localhost:5000 |
| ❤️ API health | http://localhost:5000/health |
| 📦 MinIO console | http://localhost:9001 |
| 🐇 RabbitMQ console | http://localhost:15672 |
| 🐘 PostgreSQL | localhost:5432 |

Useful commands:

```bash
docker compose logs -f api web
docker compose down
docker compose down --volumes  # also deletes local data
```

## 🏛️ Architecture at a glance

```
Browser / Mobile app
        │  HTTPS
        ▼
┌───────────────────┐
│   Next.js (web)   │  :3000
│   Dashboards      │────────────▶  ASP.NET Core (api)  :5000
│   Traveler + Admin│                EF Core · JWT · roles
└───────────────────┘                MinIO · RabbitMQ · PostgreSQL
Mobile (Expo) ──── Bearer token ───▶
```

The API is the single source of truth for data, auth, and business rules. Full breakdown in
[ARCHITECTURE.md](./ARCHITECTURE.md).

## 📁 Repository layout

| Path | Purpose |
|---|---|
| [`api/Expenn.Api/`](./api/Expenn.Api) | .NET 9 API; owns auth, business logic, and the PostgreSQL schema |
| [`web/`](./web) | Next.js web app |
| [`mobile/`](./mobile) | Expo SDK 54 mobile client |
| [`docker-compose.yml`](./docker-compose.yml) | Complete local/deployment stack |
| [`.env.example`](./.env.example) | The only environment template |

## 🔧 Configuration

All Compose configuration lives in the ignored root `.env`. The tracked `.env.example` lists the
required variable names with intentionally empty values; fill the local copy before starting the
stack.

| Variable | Purpose |
|---|---|
| `APP_URL` | Public web URL and allowed browser origin |
| `API_URL` | Public API URL compiled into browser clients |
| `STORAGE_URL` | Public MinIO URL returned for uploaded files |
| `POSTGRES_PASSWORD` | PostgreSQL password |
| `MINIO_PASSWORD` | MinIO password shared with the API |
| `RABBITMQ_PASSWORD` | RabbitMQ password shared with the API |
| `JWT_SECRET` | API token-signing secret |

⚠️ Change every password and secret before deployment. Optional email and SSO values are
documented in [api/README.md](./api/README.md) and [web/README.md](./web/README.md); inject them
through the deployment platform when enabling those features.

## Mobile apps

<div align="center">

[![iOS](https://img.shields.io/badge/iOS-Coming_soon-0A0A0F?style=for-the-badge&logo=apple&logoColor=white)](#mobile-apps)
[![Android](https://img.shields.io/badge/Android-Coming_soon-0A0A0F?style=for-the-badge&logo=android&logoColor=white)](#mobile-apps)

</div>

📱 **The App Store and Play Store listings aren't live yet** — signed builds already ship through
TestFlight and Play Console from CI, and public listings are next. Until then, running the
traveler app takes about a minute:

```bash
docker compose up -d db minio minio-init rabbitmq api   # backend in Compose
cd mobile && pnpm install && pnpm start                 # app on your host
```

Scan the QR code with **Expo Go** and you're in. Set `EXPO_PUBLIC_API_URL` in your shell when a
simulator or physical device cannot reach `http://localhost:5000` — use the computer's LAN address
for a physical device. See [mobile/README.md](./mobile/README.md).

| | Identifier |
|---|---|
| 🍎 iOS bundle | `com.expenn.traveler` |
| 🤖 Android package | `com.osascloud.expenn` |

## 🌐 Deployment

Use production secrets, set all three public URLs to HTTPS endpoints, and run:

```bash
docker compose up -d --build
```

Place a TLS-terminating reverse proxy in front of web, API, and object storage. Do not commit the
production `.env` or expose PostgreSQL, RabbitMQ, or MinIO administration ports publicly; restrict
those published ports in the deployment platform or a production override.

## 🤖 CI/CD

| Workflow | Purpose |
| --- | --- |
| `api-ci.yml` | Restore/build the .NET API, validate Compose, build/publish the API image |
| `web-ci.yml` | Type-check, lint, build, publish, and smoke-test the web image |
| `mobile-android-dev.yml` | Type-check, signed APK, distribute to testers via Firebase App Distribution (`dev`) |
| `mobile-ios-dev.yml` | Signed Ad Hoc IPA, distribute to testers via Firebase App Distribution (manual) |
| `mobile-android-release.yml` | Signed AAB, upload to Google Play Console (`main`) |
| `mobile-ios-release.yml` | Signed IPA, upload to App Store Connect / TestFlight (`main`) |
| `release.yml` | Create a GitHub release from a `vX.Y.Z` tag |

Container images live at `ghcr.io/usmhic/expenn-api` and `ghcr.io/usmhic/expenn-web`. Mobile
credentials remain in GitHub Secrets; see the [mobile guide](./mobile/README.md#cicd).

## 📚 Documentation

| Doc | What's in it |
|---|---|
| [Architecture](./ARCHITECTURE.md) | Service boundaries, data flow, and directory purposes |
| [API guide](./api/README.md) | .NET modules, migrations, and optional integrations |
| [Web guide](./web/README.md) | Next.js app, workspace routing, and the help center |
| [Mobile guide](./mobile/README.md) | Expo setup, device testing, Fastlane, and releases |
| [Mobile delivery](./MOBILE_DELIVERY.md) | Signing secrets, App Distribution, and store submission |
| [Engineering standards](./STANDARDS.md) | Shared conventions across every usmhic project |
| [Package naming](./PACKAGE_NAMING.md) | Public package, namespace, and app identifiers |
| [Coding-agent guide](./AGENTS.md) | Repository map, commands, and guardrails |
| [Security policy](./SECURITY.md) | Private vulnerability reporting and deployment notes |

## 🤝 Contributing

Issues and pull requests are welcome — focused fixes, bold ideas, and thoughtful docs improvements
all count. Start with [CONTRIBUTING.md](./CONTRIBUTING.md) and follow the
[Code of Conduct](./CODE_OF_CONDUCT.md).

## 📄 License

[MIT](./LICENSE) © [usmhic](https://github.com/usmhic)

<div align="center"><sub>Because nobody has ever enjoyed a shoebox full of receipts. 🧾</sub></div>
