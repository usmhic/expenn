# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Review & pay** page for admins and managers: tabs for to review, to pay, paid, and
  sent back; bulk approve, send back, and mark paid; one-click selection of expenses
  without issues; CSV export for payroll and accounting imports.
- Expense lifecycle rules in `Domain/Expenses/ExpenseWorkflow.cs`. Travelers can edit and
  delete drafts, fix rejected expenses, and resubmit; reviewers must give a reason when
  sending an expense back.
- Review trail on expenses (`submitted_at`, `reviewed_at`, `reviewed_by_id`,
  `review_note`, `reimbursed_at`) via the `AddExpenseReviewAudit` migration.
- Review hints for missing receipts and possible duplicates.
- Per-currency totals in the expense summary and analytics, plus time-to-decision and
  time-to-reimburse metrics.
- `PRODUCT_STRATEGY.md`: market research, product gaps, roadmap, and business model.

- Replaced the Expo mobile icon, adaptive icon, and splash placeholders with the existing Expenn brand logo used by the web app.
- A documented modular API architecture with schema ownership for identity,
  organizations, travel, expenses, and documents.
- Shared engineering standards, coding-agent guidance, Dependabot configuration,
  and a private security-reporting path.
- Initial public documentation pass: `LICENSE`, `CODE_OF_CONDUCT.md`, issue/PR
  templates, `ARCHITECTURE.md`, and a root `docker-compose.yml` for
  local development.
- Native (non-EAS) GitHub Actions CI/CD for the mobile app: separate Android/iOS
  workflows that `expo prebuild` and sign with Fastlane using credentials from GitHub
  Secrets, with dev builds as workflow artifacts and `main`-triggered publishing to
  Google Play Console and TestFlight. Replaces the unautomated `eas build`/`eas submit`
  flow. See `mobile/README.md#cicd` for required secrets and release setup.

### Changed

- One receipt-first expense form for Add, Edit, and Capture, with standard categories,
  today's date, the active trip and its currency preselected, and company-card spend
  marked as not reimbursable.
- The Capture page no longer pre-fills fake "Demo Merchant" values.
- Analytics now uses real API data (it previously read fields the API never returned)
  and never adds different currencies together.
- The notification bell links to the place where each item is handled and includes
  travelers' sent-back expenses.
- Added the Expo WebBrowser dependency and completed the mobile OAuth callback typing and production API fallback used by Traveler authentication.
- Aligned the mobile app with Expo SDK 54 patch versions and added the required `expo-constants` peer dependency for `expo-router`.
- Standardized the Android application ID to `com.osascloud.expenn` for Google Play releases.
- Added a documented package-naming contract for .NET namespaces, JavaScript app names, and Android identifiers.
- Replaced the EF Core migration history with one multi-schema baseline that
  creates fresh databases and moves legacy `public` tables without dropping data.
- Consolidated environment configuration into a single root `.env.example`
  and `.gitignore`, replacing the per-service copies that previously lived
  under `api/Expenn.Api/`, `web/`, and `mobile/`. The API no longer loads a
  `.env` file itself (removed the `DotNetEnv` dependency); configuration is
  supplied entirely through the process environment.
- Aligned package, web, API, container, documentation, and workflow metadata
  with the usmhic open-source ecosystem.

### Fixed

- The API read the `sub` and `role` claims by their raw names while the JWT handler
  renamed them, so user-scoped requests (creating a workspace, listing your expenses)
  resolved an empty user id. Inbound claim mapping is now disabled.
- Pending expenses without a trip could not be reviewed from the admin dashboard.
- Trip team cards showed the organisation's member count instead of the team's trips.

## [0.1.0] - 2026-07-18

### Added

- ASP.NET Core 9 API as the single source of truth for auth and data, replacing
  the previous Better Auth + Drizzle setup.
- Next.js 16 web app and Expo SDK 54 mobile app, both consuming the .NET API.

[Unreleased]: https://github.com/usmhic/expenn/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/usmhic/expenn/releases/tag/v0.1.0
