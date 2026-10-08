# Product strategy

*Market research, product gaps, roadmap, and a business model for Expenn. October 2026.*

> **In one line:** Expenn should be the *Plausible of expense management*. It installs with one
> `docker compose up`, keeps passports and receipts on your own servers, and doesn't charge per seat
> for getting people reimbursed.

Competitor prices change often and many vendors no longer publish them. Treat every price below as
something to recheck before quoting it publicly. Figures marked *unverified* come from third-party
aggregators.

---

## 1. Where Expenn stands today

**Strengths**

- **One install.** A single API, web app, and mobile app, started with one `docker compose up`.
- **Easy sign-in.** Passwordless OTP, plus LDAP/Entra/OIDC for companies.
- **Trips come first.** Trips have budgets and pre-approval. Most SMB tools bolt trips on as an afterthought.
- **Document vault.** Passports and visas are stored on your own infrastructure. That is unusual, and it sells well wherever data sovereignty matters.
- **Built to grow.** A clean modular monolith with domain schemas, so features can be added without a rewrite.

**Gaps found in the product audit, and what this change did about them**

| Gap | Impact | Status |
|---|---|---|
| JWT `sub`/`role` claims were renamed by the auth handler, so user-scoped API calls saw an empty user id | Creating a workspace failed; travelers' lists were empty | **Fixed** |
| No expense lifecycle rules: a draft could be "reimbursed", and a rejected expense could be approved | Broken audit trail | **Fixed**: explicit workflow in `Domain/Expenses` |
| Rejected expenses were a dead end, and the review note was thrown away | Travelers couldn't get paid, and nobody knew why | **Fixed**: required reason, fix and resubmit |
| No central review queue. Expenses without a trip couldn't be reviewed at all | Finance had to open trips one by one | **Fixed**: **Review & pay** page with bulk actions |
| No export | Finance re-typed data into payroll or accounting | **Fixed**: CSV export, safe against spreadsheet formula injection |
| Capture page pre-filled fake "Demo Merchant / 42.70" values | Real users could submit fake data | **Fixed**: honest, receipt-first form |
| Analytics read fields the API never returned, so every KPI showed 0. Totals mixed currencies | Dashboard was decorative | **Fixed**: real per-currency analytics, time-to-decision, time-to-reimburse |
| Free-text categories | Analytics and accounting mapping were unreliable | **Fixed**: standard categories (free text is still accepted) |
| No duplicate or missing-receipt detection | Leakage, fraud | **Fixed**: non-blocking review flags |
| No receipt OCR | Extra typing on every receipt; OCR is table stakes | Next (see roadmap) |
| No mileage, per diem, or policy limits | Common reasons buyers reject a tool | Next |
| Single approval step; managers can review any expense in the org | Doesn't fit larger teams | Next |
| No notifications by email or push (consumers are TODO stubs) | Approvals stall | Next |

---

## 2. Market

### Size

Estimates depend on definitions. All agree the market is large and growing roughly 10–15% a year.

| Source | Base | Forecast | CAGR |
|---|---|---|---|
| Global Market Insights (2026) | $8.3B (2025) | $21.4B (2035) | 10% |
| Allied Market Research (2026), SaaS only | $5.5B (2024) | $21.9B (2034) | 15% |
| Technavio (2025) | — | +$7.5B (2024–2029) | 16.2% |

### Competitors

| Vendor | Price (per user/month) | How they really make money | Weak spot for an SMB |
|---|---|---|---|
| Expensify | ~$5 Collect / ~$9 Control | Subscriptions + card | Bills every member, active or not; history of pricing changes |
| Ramp, Brex | Free core; ~$12–15 Plus tiers | Card interchange | US- and card-centric; platform fees not published; Brex is being acquired by Capital One |
| Navan | Expense free for 5 users, then ~$15/active user | Travel commissions | Lock-in to their booking flow |
| SAP Concur | Quote only (~$7–11/report, *unverified*) | Enterprise licences | Heavy and slow; widely disliked user experience |
| Zoho Expense | Free ≤3 users; ~$4–6 | Suite upsell | Approvers need paid seats |
| Rydoo, Fyle | €8–12 / $12–15, 5-user minimums | Subscriptions | Per diem and multi-level approvals are gated to upper tiers |
| Pleo, Spendesk, Payhawk | Platform fee + per user | Cards, FX | FX markups; card-first |

**The pattern:** the leaders give software away and monetize **cards, FX, and travel bookings**.
Software-only vendors cluster at **$5–15 per user per month**, with minimums and gated tiers.

### Open-source alternatives

There is **no modern, standalone, open-source team expense and travel tool with approvals and a
mobile app.** The options today are:

- **Personal finance trackers** such as Firefly III and ExpenseOwl.
- **Group-splitting tools** such as IHateMoney and Spliit.
- **Full ERPs** such as Odoo and Frappe HR. They have expense claims and travel requests, but you have to adopt the whole ERP.

### What users complain about, and Expenn's answer

| Complaint (from G2, Capterra, Reddit, vendor surveys) | Expenn's answer |
|---|---|
| Slow reimbursement: in one UK survey only 30% of staff were repaid within a week | "Owed to you" is shown to travelers. Finance gets a to-pay queue, bulk "mark paid", and a time-to-reimburse metric |
| Clunky, click-heavy UI with a learning curve (Concur, Emburse) | One form, smart defaults, five clear statuses, bulk actions |
| Pricing creep and billing for inactive users or approvers | Free self-hosting, and approvers are never billed (see §5) |
| OCR errors and upload glitches | A receipt-first form today; pluggable extraction next, with a human confirming every field |
| Per diem, mileage, and multi-currency locked behind upper tiers | On the roadmap as core (free) features |
| AI-generated fake receipts, said to be ~71% of fakes one vendor flagged by mid-2026 | Duplicate flags today; receipt-integrity checks in the paid Scan service |

---

## 3. Positioning and who to win first

**Positioning:** *Self-hosted expense and travel management that your team will actually use: no
per-seat tax, and your data never leaves your servers.*

**Beachhead segments, in order:**

1. **EU SMBs and scale-ups (10–250 staff) that care about data sovereignty.** GDPR and the
   CLOUD Act make US SaaS a hard sell to their DPOs. The passport vault is a differentiator.
2. **NGOs, research institutes, and universities.** They have grant- and project-coded travel,
   procurement rules, and on-prem requirements. Today they use Concur or Chrome River, or
   spreadsheets.
3. **Agencies and consultancies with billable client travel.** They need clean per-trip exports
   to re-bill clients.
4. **MSPs and IT providers.** They host Expenn for many small clients, which is a channel rather
   than an end customer.

**Product principles** (use them to settle roadmap debates):

- **Five statuses, one form, zero training.** If a feature needs a manual, simplify it.
- **The traveler always knows where their money is.**
- **Never add money in different currencies.** Show amounts side by side, or convert explicitly.
- **Flags inform; they never block.** Humans decide.
- **Everything a five-person team needs is free.** Pay for scale, compliance, and services, never for getting reimbursed.

---

## 4. Roadmap

Ordered by the value to an SMB buyer relative to the effort.

### Now (shipped in this change)

- Review & pay queue with bulk actions and a CSV export
- Fix-and-resubmit, with a required reason when an expense is sent back
- Duplicate and missing-receipt flags
- Per-currency analytics and cycle-time metrics
- Receipt-first capture

### Next 90 days

1. **Receipt extraction behind an interface** (`IReceiptExtractor`), with three providers:
   - *local* (Tesseract or a small vision model)
   - *bring your own API key*
   - *Expenn Scan* (paid, §5)

   It writes to the existing `expenses.extraction` jsonb column. The user confirms every field.
2. **Notifications.** Email (MailKit is already wired) and Expo push for submitted, sent-back, approved, and paid expenses. Add a weekly digest for approvers.
3. **Mileage** (distance × a rate table set per workspace) and **per diem** (a daily allowance per destination with meal deductions). Both are pure core logic.
4. **Policy rules.** Per-category limits and a "receipt required above X" rule. These produce flags (`over_limit`), never blocks.
5. **Team-scoped review for managers.** This matches how trips already work, and adds approval routing to the team's manager.
6. **Mobile parity:** edit and resubmit, plus the to-review queue for managers.

### 6–12 months

- **Base-currency reporting** using daily FX rates stored per expense; keep the original amount.
- **Accounting connectors:** Xero, QuickBooks Online, DATEV CSV. Also a **payout file**: a SEPA XML / NACHA batch generated from the to-pay queue.
- **Multi-level approvals** (amount thresholds), delegation, and out-of-office.
- Card-feed import (CSV/OFX first) with automatic receipt matching.
- An audit log export and SCIM provisioning.

---

## 5. Business model

### What we charge for

**Charge for what costs us money (hosting, AI inference, support) or what saves an organisation
real money (compliance, integrations, SLAs).** Never charge per seat for the core job of getting
people reimbursed. Never bill approvers.

Card interchange and travel commissions are deliberately **out of scope**:

- Interchange needs a banking partner, compliance work, and capital.
- Commissions conflict with "the cheapest fare wins".

If they are ever added, it should be through a partner (for example Stripe Issuing) in year 3 or
later.

### Plans

| Plan | Who it's for | Price | What's included |
|---|---|---|---|
| **Community** (self-hosted) | Everyone | **Free forever, unlimited users** (MIT) | Everything in this repository: trips, approvals, review & pay, CSV export, document vault, mobile apps, SSO via OIDC/LDAP |
| **Cloud Free** | Tiny teams trying it out | $0, up to **5 active users** | Hosted Community edition, 25 Scan receipts per month |
| **Cloud Team** | SMBs | **$4 per active user per month**, $20 minimum | EU or US hosting, backups, email and push, 100 Scan receipts per active user per month, email support |
| **Cloud Business** | Growing orgs | **$7 per active user per month** | Team, plus SAML/SCIM, multi-level approvals, accounting connectors, payout files, audit log export, priority support |
| **Self-hosted Business licence** | Sovereignty-first orgs, the public sector | **$1,490 per year per instance**, up to 250 users; then custom | The Business features on your own servers, signed releases, upgrade assistance |
| **Enterprise and support** | Universities, government, MSPs | Custom | SLA, security reviews, an installation partner, white-label for MSPs |
| **Expenn Scan** (usage-based) | Anyone, self-hosted included | Included allowance, then **$0.03 per receipt** | AI extraction, receipt-integrity and duplicate checks |

**Definitions and discounts**

- An **active user** is someone who submitted at least one expense that month. Approvers and admins are free.
- **Nonprofits and education** get 50% off Cloud. Registered nonprofits with fewer than 50 staff get the self-hosted licence free.

### Why this is sustainable

- **Margins.** Hosting a modular monolith costs cents per active user per month. Vision-model
  receipt extraction costs roughly $0.002–0.01 per receipt depending on provider (an estimate to
  benchmark), so Scan earns a healthy margin at $0.03.
- **Funnel.** Community installs are the free acquisition channel. Cloud converts teams that
  don't want to run servers. Licences convert teams that must run servers.
- **Pricing as marketing.** Charging per active user, with free approvers, undercuts every
  software-only competitor and answers the most common billing complaint.
- **Illustrative year-2 target, not a forecast:**
  - 150 Cloud workspaces × 18 active users × $5 average × 12 months ≈ **$162k**
  - 40 self-hosted licences × $1,490 ≈ **$60k**
  - Scan overage ≈ **$20k**
  - Total ≈ **$240k ARR**, enough for two full-time maintainers.

### Licensing

The repository is MIT today. Keep the core MIT; trust drives adoption. Put paid features in a
separate `ee/` directory or a private module under a commercial licence, as Cal.com does.
Relicensing the core to AGPL would deter hosted clones (Plausible, Documenso), but it is the
maintainer's call and needs contributors' agreement.

### Metrics that matter

| Stage | Metric |
|---|---|
| Activation | First expense submitted within 10 minutes of signup |
| Product health | Median time to decision; median time to reimburse; share of expenses approved first time (no send-back) |
| Revenue | Free → paid conversion; net revenue retention; Scan receipts per active user |

---

## 6. Go-to-market

- **Distribution where self-hosters already are:** one-click templates for Coolify, Railway,
  Elestio, Unraid, and TrueNAS; an awesome-selfhosted listing; Docker Hub and GHCR.
- **Comparison pages:** "Expensify alternative", "open-source Concur alternative", "GDPR expense
  software". The pricing table is the pitch.
- **Templates by segment:** NGO grant travel, university conferences, agency client re-billing.
- **MSP partner programme:** a white-label licence with volume pricing.
- **Build in public:** a public roadmap and the changelog, and a monthly release note highlighting
  time-to-reimburse wins.

## 7. Risks

| Risk | Mitigation |
|---|---|
| Card-first incumbents bundle expenses for free | Compete on sovereignty, no lock-in, and working with any card or bank |
| Hosted clones of the MIT core | Brand, Scan, and the `ee/` features; AGPL stays an option |
| OCR accuracy expectations | Human-confirmed fields; pluggable providers; show confidence |
| Maintainer bandwidth | Keep the core small; let paid plans fund maintainers; welcome community connectors |

## Sources

Market research was gathered in October 2026. Prices are indicative and should be rechecked.

**Market size**
- [Global Market Insights](https://www.gminsights.com/industry-analysis/expense-management-market)
- [Technavio](https://www.technavio.com/report/expense-management-software-market-analysis)

**Competitor pricing**
- [Expensify plans](https://help.expensify.com/articles/new-expensify/billing-and-subscriptions/Plan-types-and-pricing)
- [Ramp pricing (Corpay)](https://www.corpay.com/resources/blog/ramp-pricing)
- [Capital One / Brex](https://capitalone.com/about/newsroom/capital-one-to-acquire-brex/)
- [Navan (CostBench)](https://costbench.com/software/expense-management/navan/hidden-costs)
- [Rydoo pricing](https://www.rydoo.com/pricing/)
- [Fyle pricing](https://www.fylehq.com/pricing)
- [Zoho Expense (CostBench)](https://costbench.com/software/expense-management/zoho-expense/free-plan/)
- [Odoo pricing](https://www.odoo.com/pricing)

**User complaints and fraud**
- [Reimbursement survey (Accountancy Age)](https://accountancyage.com/2025/04/17/why-expense-systems-are-failing-uk-staff-in-2025/)
- [Concur UI feedback](https://community.concur.com/t5/Concur-Expense/New-Concur-UI-is-poorly-designed-and-will-cost-my-team-hours/m-p/68350)
- [AI-generated receipts (PYMNTS)](https://www.pymnts.com/?p=3892615)

**Open-source alternatives**
- [Frappe HR travel requests](https://docs.frappe.io/erpnext/user/manual/en/travel-request)

**Open-core peers**
- [Cal.com EE](https://next.cal.com/blog/changing-to-agplv3-and-introducing-enterprise-edition)
- [Plausible self-hosting](https://plausible.io/docs/self-hosting)
- [Twenty pricing](https://docs.twenty.com/user-guide/billing/capabilities/pricing-plans)
- [Documenso Business Edition](https://documenso.com/blog/introducing-the-documenso-business-edition-self-hosted)

**Data sovereignty**
- [EU cloud sovereignty framework (Jones Day)](https://www.jonesday.com/en/insights/2026/06/european-commissions-proposed-cloud-sovereignty-framework-creates-new-compliance-tiers-for-software-providers)
