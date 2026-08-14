# Contributing to Expenn

Repository-wide conventions live in [STANDARDS.md](./STANDARDS.md), and the
concise machine-readable working map lives in [AGENTS.md](./AGENTS.md).

Thank you for contributing. By participating, you agree to follow the [Code of Conduct](./CODE_OF_CONDUCT.md).

## Start locally

Install Docker 24+ with Compose v2, then:

```bash
git clone https://github.com/usmhic/expenn.git
cd expenn
cp .env.example .env
# Fill every empty value in .env before starting Compose.
docker compose up --build
```

On PowerShell, use `Copy-Item .env.example .env`. The web app is available at http://localhost:3000. Node and pnpm versions are pinned in `mise.toml`; install the .NET 9 SDK for native API work.

## Make a change

1. Create a focused branch from `dev` (`feat/...`, `fix/...`, `docs/...`, or `chore/...`).
2. Keep API, web, and mobile concerns inside their existing top-level directories.
3. Add EF Core migrations for schema changes; never edit a deployed schema manually.
4. Update root `.env.example` only when a new value is required to run the default Compose stack. Keep every example value empty and keep optional integration secrets out of it.
5. Update the nearest README when behavior or setup changes.

Use Conventional Commit-style subjects, for example `fix duplicate expense approval` or `docs clarify mobile setup`.

## Checks

Run the checks for every area you changed:

```bash
dotnet build api/Expenn.Api/Expenn.Api.csproj
pnpm --dir web install --frozen-lockfile
pnpm --dir web types:check
pnpm --dir web lint
pnpm --dir mobile install --frozen-lockfile
pnpm --dir mobile exec tsc --noEmit
```

Validate cross-service changes from the repository root:

```bash
docker compose config --quiet
docker compose up --build
```

To create a migration:

```bash
dotnet tool restore --tool-manifest api/dotnet-tools.json
dotnet ef migrations add <Name> --project api/Expenn.Api/Expenn.Api.csproj --output-dir Data/Migrations
```

## Pull requests

Use the pull-request template and include:

- the problem and why the change is needed;
- the implementation scope and any trade-offs;
- commands or manual flows used to verify it;
- screenshots for visible UI changes;
- migration, configuration, or compatibility notes.

Keep pull requests small enough to review. CI must pass, and reviews should resolve before merge. Never include credentials, personal data, generated build output, or local `.env` files.

For help, open an issue or GitHub Discussion.
