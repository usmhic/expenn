# Security policy

## Reporting a vulnerability

Please do not open a public issue for a suspected vulnerability. Use
[GitHub private vulnerability reporting](https://github.com/usmhic/expenn/security/advisories/new)
and include the affected commit or version, reproduction steps, impact, and a
suggested mitigation when possible.

Remove credentials, personal data, receipts, expense records, and production
logs from the report. The maintainer will acknowledge a complete report as soon
as practical, coordinate a fix, and credit the reporter unless anonymity is
requested.

## Supported versions

Security fixes target the latest release and the `main` branch. Older versions
may require an upgrade.

## Deployment notes

Use HTTPS, keep PostgreSQL, RabbitMQ, and MinIO private, rotate all local sample
credentials, verify billing webhooks, and store production and mobile signing
secrets outside the repository.
