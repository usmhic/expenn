# Expenn

[![API](https://github.com/usmhic/expenn/actions/workflows/api-ci.yml/badge.svg)](https://github.com/usmhic/expenn/actions/workflows/api-ci.yml)
[![Web](https://github.com/usmhic/expenn/actions/workflows/web-ci.yml/badge.svg)](https://github.com/usmhic/expenn/actions/workflows/web-ci.yml)
[![Android](https://github.com/usmhic/expenn/actions/workflows/mobile-android-ci.yml/badge.svg)](https://github.com/usmhic/expenn/actions/workflows/mobile-android-ci.yml)
[![iOS](https://github.com/usmhic/expenn/actions/workflows/mobile-ios-ci.yml/badge.svg)](https://github.com/usmhic/expenn/actions/workflows/mobile-ios-ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

Expenn is a self-hosted expense and travel-management platform for teams.

## Tech stack

| Surface | Stack |
| --- | --- |
| API | .NET 9, ASP.NET Core, EF Core, PostgreSQL, MassTransit |
| Web | Next.js, React, TypeScript, Fumadocs |
| Mobile | Expo, React Native, Fastlane |
| Infrastructure | MinIO, RabbitMQ, Docker Compose |
| Delivery | GitHub Actions, GHCR, Play Console, TestFlight |

## Repository layout

| Path | Purpose |
|---|---|
| `api/Expenn.Api/` | .NET 9 API; owns auth, business logic, and the PostgreSQL schema |
| `web/` | Next.js web app |
| `mobile/` | Expo SDK 54 mobile client |
| `docker-compose.yml` | Complete local/deployment stack |
| `.env.example` | The only environment template |

See [ARCHITECTURE.md](./ARCHITECTURE.md) for service boundaries and data flow.

## Quick start

Docker Compose is the supported full-stack development path. It starts PostgreSQL, MinIO, RabbitMQ, the API, and the web app, and creates the object-storage bucket automatically.

```bash
cp .env.example .env
# Fill every empty value in .env before starting Compose.
docker compose up --build
```

On PowerShell, use `Copy-Item .env.example .env` for the first command.

| Service | URL |
|---|---|
| Web | http://localhost:3000 |
| API | http://localhost:5000 |
| API health | http://localhost:5000/health |
| MinIO console | http://localhost:9001 |
| RabbitMQ console | http://localhost:15672 |
| PostgreSQL | localhost:5432 |

Useful commands:

```bash
docker compose logs -f api web
docker compose down
docker compose down --volumes  # also deletes local data
```

## Configuration

All Compose configuration lives in the ignored root `.env`. The tracked
`.env.example` lists the required variable names with intentionally empty
values; fill the local copy before starting the stack.

| Variable | Purpose |
|---|---|
| `APP_URL` | Public web URL and allowed browser origin |
| `API_URL` | Public API URL compiled into browser clients |
| `STORAGE_URL` | Public MinIO URL returned for uploaded files |
| `POSTGRES_PASSWORD` | PostgreSQL password |
| `MINIO_PASSWORD` | MinIO password shared with the API |
| `RABBITMQ_PASSWORD` | RabbitMQ password shared with the API |
| `JWT_SECRET` | API token-signing secret |
| `INTERNAL_SECRET` | Shared secret for web-to-API billing updates |

Change every password and secret before deployment. Optional email, SSO, and Paddle values are documented in [api/README.md](./api/README.md) and [web/README.md](./web/README.md); inject them through the deployment platform when enabling those features.

## Mobile development

The mobile app is interactive and runs on the host, while its backend runs in Compose:

```bash
docker compose up -d db minio minio-init rabbitmq api
cd mobile
pnpm install
pnpm start
```

Set `EXPO_PUBLIC_API_URL` in your shell when a simulator or physical device cannot reach `http://localhost:5000`; use the computer's LAN address for a physical device. See [mobile/README.md](./mobile/README.md).

## Deployment

Use production secrets, set all three public URLs to HTTPS endpoints, and run:

```bash
docker compose up -d --build
```

Place a TLS-terminating reverse proxy in front of web, API, and object storage. Do not commit the production `.env` or expose PostgreSQL, RabbitMQ, or MinIO administration ports publicly; restrict those published ports in the deployment platform or a production override.

## CI/CD

| Workflow | Purpose |
| --- | --- |
| `api-ci.yml` | Restore/build the .NET API, validate Compose, build/publish the API image |
| `web-ci.yml` | Type-check, lint, build, publish, and smoke-test the web image |
| `mobile-*-ci.yml` | Type-check and produce signed development artifacts |
| `mobile-*-release.yml` | Publish release builds to Play Console or TestFlight |
| `release.yml` | Create a GitHub release from a `vX.Y.Z` tag |

Container images live at `ghcr.io/usmhic/expenn-api` and
`ghcr.io/usmhic/expenn-web`. Mobile credentials remain in GitHub Secrets; see
the [mobile guide](./mobile/README.md#cicd).

## Documentation

- [Architecture](./ARCHITECTURE.md)
- [API guide](./api/README.md)
- [Web guide](./web/README.md)
- [Mobile guide](./mobile/README.md)
- [Engineering standards](./STANDARDS.md)
- [Coding-agent guide](./AGENTS.md)
- [Security policy](./SECURITY.md)

## Contributing

Issues and pull requests are welcome. Start with [CONTRIBUTING.md](./CONTRIBUTING.md) and follow the [Code of Conduct](./CODE_OF_CONDUCT.md).

## License

[MIT](./LICENSE) © [usmhic](https://github.com/usmhic)
