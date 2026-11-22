# Repository review — 2026-10-11

Changes are prepared locally on `dev` for the maintainer to review, commit, and push.
No source commits, merges, source pushes, deployments, or store submissions were made.
The GitHub PR closures and remote bot-branch deletions below were explicitly requested.

## Product, branding, and content

- Modernized the traveler/admin landing page with locally bundled Inter, Bricolage Grotesque, and Instrument Serif fonts (SIL licenses included), cobalt/mint colors, responsive product previews, accessible mobile navigation, focus styles, and reduced-motion support.
- Preserved account-aware dashboard links and both traveler/admin views.
- Replaced misleading app-store download badges with localized iOS/Android access requests and added a direct web signup action.
- Corrected automatic filing, ERP integration, reimbursement timing, and unverified adoption claims in English/Spanish. Described CSV exports and team-recorded payment status accurately; labeled mockups as illustrative.
- Corrected stale mobile workflow names, release triggers, placeholder-artwork warnings, and contributor ports.

## Workflows and contributor guidance

- All existing Node setup steps now use the repository pin, Node 24.18.0; pnpm remains 11.6.0.
- Web CI checks the environment template after toolchain setup, verifies its log runner, checks types/tests where configured, and runs a production build before image publication.
- Check output is retained in `ci-logs/*.log`, summarized in GitHub Actions, and uploaded as `web-check-logs` for 14 days, including failed checks. The runner preserves failures and redacts known secret environment values; tests cover failure propagation and secrets split across output chunks. Logs are ignored locally.
- Development and contributor PRs target `dev`. Existing image publication remains restricted to pushes to `dev`; store submissions remain manual from `dev` through the production environment. Release tags must be reachable from `dev`.
- Scheduled Dependabot version PRs are paused locally with limit 0 and explicit `dev` targets. This takes effect after the maintainer pushes. GitHub security-alert/security-update settings were not changed; manual dependency and security-alert triage is still required.
- Corrected documentation that described `main`, automatic `latest` images, obsolete EAS delivery, and inconsistent environment-template rules. Non-secret localhost defaults are allowed; secrets stay empty in the committed template.

## GitHub cleanup

- Confirmed the default and working branch is `dev`.
- Closed 18 bot PRs without merging: [#26](https://github.com/usmhic/expenn/pull/26), [#23](https://github.com/usmhic/expenn/pull/23), [#22](https://github.com/usmhic/expenn/pull/22), [#20](https://github.com/usmhic/expenn/pull/20), [#19](https://github.com/usmhic/expenn/pull/19), [#18](https://github.com/usmhic/expenn/pull/18), [#17](https://github.com/usmhic/expenn/pull/17), [#16](https://github.com/usmhic/expenn/pull/16), [#14](https://github.com/usmhic/expenn/pull/14), [#13](https://github.com/usmhic/expenn/pull/13), [#12](https://github.com/usmhic/expenn/pull/12), [#11](https://github.com/usmhic/expenn/pull/11), [#9](https://github.com/usmhic/expenn/pull/9), [#7](https://github.com/usmhic/expenn/pull/7), [#5](https://github.com/usmhic/expenn/pull/5), [#4](https://github.com/usmhic/expenn/pull/4), [#3](https://github.com/usmhic/expenn/pull/3), [#1](https://github.com/usmhic/expenn/pull/1).
- Removed 19 remote bot branches, including branches GitHub automatically deleted after PR closure. Verified that only `dev` remains on the remote.
- Removed the stale local `eager-eagle` bot branch after confirming it was merged into `dev` and its worktree directory no longer existed. Pruned only stale Git worktree metadata.
- Before cleanup, fetched bot branch tips and created a verified local recovery bundle at `.cache/repository-audit/bot-branches-2026-10-11.bundle`. JSON snapshots and cleanup results are beside it; these local artifacts are ignored by Git.
- Recovery: inspect with `git bundle list-heads .cache/repository-audit/bot-branches-2026-10-11.bundle`; fetch an explicitly selected archived ref into a new recovery branch if needed.

| Removed branch | Archived tip |
| --- | --- |
| `claude/modest-turing-25r178` | `b712adf1d5a1998848684602309d317379fc132b` |
| `dependabot/github_actions/actions/checkout-7` | `7bd938dd3bdda11dd43b806a7c339cdd8c22b18d` |
| `dependabot/github_actions/actions/setup-dotnet-6` | `6be93c6b910d8e98505bb61f4f142ce87d7e9208` |
| `dependabot/github_actions/docker/build-push-action-7` | `0fde9421569866a019b490b9864e838a46eeca5b` |
| `dependabot/github_actions/docker/metadata-action-6` | `2e3bf9044c5872f3dae7381025094d1642a71149` |
| `dependabot/github_actions/pnpm/action-setup-6` | `988dfb703f6dc67613887ceb59263d0a12b5afbd` |
| `dependabot/npm_and_yarn/mobile/expo-57.0.12` | `0be275cc01cc0ede350a07036fd14be2c61aa4b7` |
| `dependabot/npm_and_yarn/mobile/expo-camera-57.0.3` | `8c0fd1e3defe6cc82f9e36694055e48320a92170` |
| `dependabot/npm_and_yarn/mobile/expo-secure-store-57.0.1` | `f1ab121aa4277eab41e12bd73157e3b045700b7f` |
| `dependabot/npm_and_yarn/mobile/expo-status-bar-57.0.1` | `7c54ca915a5c02b7dae6401b8a51433044d03060` |
| `dependabot/npm_and_yarn/mobile/mobile-minor-4cb21b5d0e` | `2e5b5ca51b886076c409e913064b48f6082a9fa3` |
| `dependabot/npm_and_yarn/web/lucide-react-1.31.0` | `dd9b7a0bc010f24baff97033553896127ee9abd6` |
| `dependabot/npm_and_yarn/web/types/node-26.2.0` | `8950a6a9d8b1025eb9865982d443684bc83f3975` |
| `dependabot/npm_and_yarn/web/typescript-6.0.3` | `546ca4a32a5c5bfa994e4632f103dd0c03a4f971` |
| `dependabot/npm_and_yarn/web/web-minor-c4f81adc37` | `746f949d563df14f94ecb68c7e0f38a7eaf30c5c` |
| `dependabot/nuget/api/Expenn.Api/AWSSDK.S3-4.0.102.1` | `8f905d07b633acde9092a4a375e1a2a464b0b921` |
| `dependabot/nuget/api/Expenn.Api/Microsoft.Identity.Web-4.14.2` | `4c355d986e8ea6f4ad30fa944e42cbd1d13ed80a` |
| `dependabot/nuget/api/Expenn.Api/Novell.Directory.Ldap.NETStandard-4.0.0` | `1bedff0306bf84af25f80a8c712a44b4418aad7a` |
| `dependabot/nuget/api/Expenn.Api/multi-452169d3cd` | `1f532330b13871bf159df76dde4c34fc88e86313` |

## Validation

- Production Next.js build passed using the pinned Node version.
- Web TypeScript and ESLint checks passed.
- CI log-runner tests passed (successful check, failing check, output redaction, and summaries).
- All workflow files passed Actionlint 1.7.7. Environment-template validation passed.
- Tracked Markdown/MDX relative-file links were checked: 38 links, no missing targets (URL fragments and live external destinations excluded).
- Browser checks cover 320, 375, 768, 1024, and 1440 px: no document overflow, one primary heading, no nested main/link elements, and no broken images. Also checked the admin view, Spanish copy, and mobile-menu open/close.
- Local check logs are under `ci-logs/`. Browser screenshots and the complete responsive run are under the Skaddosh checkout’s `.cache/landing-qa/` and `ci-logs/responsive.log`.

## Review limits and follow-ups

This review covered public landing content, branding exports, contributor/setup/release guidance, relative documentation links, dependency-bot cleanup, and workflow configuration. It is not a complete security or legal audit of all application code.

- Local backend services were not running during the landing preview. Authenticated journeys, receipt processing, database migrations, payments, email, and external storage were not exercised end to end. The Skaddosh UI preview explicitly disabled startup migrations; production migration behavior was not changed.
- Docker/container builds and signed Android/iOS delivery were not run locally; Docker and Apple signing infrastructure were unavailable. The updated hosted workflows have not run because source changes remain local.
- Expenn’s existing Next.js middleware naming emits a migration deprecation warning. Existing Windows environment wrappers also emit Node’s shell-argument deprecation warning. Neither warning prevented the builds.
- Privacy/security policy statements about hosting, encryption at rest, retention, and support response times need confirmation against the actual operator’s deployment; infrastructure guarantees were not inferred from UI code.

## Addendum — 2026-11-22

- Rebased onto `dev` after #47 (trip bookings and totals); no conflicts.
- Removed the unused self-hosted `web/fonts/` bundle. The app loads fonts through the
  `@fontsource-variable/*` packages, and nothing referenced the WOFF2 files.
- Moved this log from the repository root to `docs/`.
