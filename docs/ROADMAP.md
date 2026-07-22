# ROADMAP — SimplifyTrabaho

Future additions, in rough priority order. Nothing here is in current scope — see
[docs/SPEC.md](docs/SPEC.md) §16 (v1, shipped) and §18 (v2, Phases 7–12, in progress)
for what IS in scope. When an item starts, move it into TRACKER.md as tasks and (if
needed) extend the SPEC first.

> Promoted out of this roadmap into v2 (2026-06-12): Workday support (now SPEC §17),
> more Tier-A ATSs (SPEC §5.1), saved filters via URL params, RSS, application
> tracker / preferences / PWA baseline (SPEC §12), SEO/reach basics (SPEC §18
> Phase 12).

## Community

- **Crowdsourced submissions** (the Simplify flywheel): GitHub issue forms for
  "add a company" / "add a listing" / "report a dead link", with a validation bot that
  verifies the ATS endpoint before a maintainer merges. Revisit once v2 lands and the
  repo has an audience.
- Multiple maintainers / org move; contribution guide (CONTRIBUTING.md).

## Coverage beyond v2

- **Polite HTML scraping** of major PH employers' own career pages without any ATS
  feed (robots.txt-respecting, low frequency, facts only). Bigger coverage (BPOs,
  conglomerates, government GOCC career pages), but fragile and gray — needs explicit
  go/no-go per the legal rules in CLAUDE.md, company by company, PR-gated like
  Workday.
- **Other enterprise platforms** (SuccessFactors, Oracle/Taleo, Phenom, Eightfold,
  Avature): evaluate each the way Workday was evaluated in SPEC §17 — only if a
  public unauthenticated feed exists, with the same guardrails and PR governance.

## Partnerships (the truly clean path to job-board data)

- **Kalibrr partnership outreach**: PH-native ATS/job board. An official API/data
  agreement would unlock a huge slice of the PH market legally. Cold-email-able.
- **JobStreet/SEEK partner program inquiry**: no open API exists (verified 2026-06),
  but a formal partnership ask costs nothing.
- **Direct employer opt-in**: a simple "want your jobs listed? add your ATS slug via
  PR/form" page — employers submitting themselves is the cleanest data source there is.

## Product features beyond v2

- **Email job alerts**, full version: per-user filter subscriptions. Needs a backend
  or paid service — start is the v2 RSS feed + a free newsletter bridge (e.g.,
  Buttondown) in Phase 12; this item is the real thing if the audience demands it.
- **Telegram/Viber digest bot** (Viber is big in PH).
- **Full mobile app** (only if the PWA proves demand).
- Trends page: postings over time, top hiring companies, function mix (all derivable
  from the never-deleted listings history).
- Salary visibility push: surface structured salary data where ATSs publish it;
  PH salary-transparency angle.
- i18n touches: Taglish UI copy option.

## Scale & ops

- Data growth: shard listings.json (per-year archives like Simplify's `archived/`)
  when git diffs get heavy.
- Search service or prebuilt index if client-side filtering hits limits.
- Status/health page for the pipeline (last run, per-company failures, Workday
  blocked-tenant dashboard).

## Explicit non-goals (unless something big changes)

- Scraping LinkedIn/JobStreet/Indeed/Glassdoor/Kalibrr without an agreement — never.
- Evading any block or bot detection, on any platform — never (SPEC §17.1).
- Hosting application flows (we always link out; we never collect applicant data).
- Paid features that gate the core list — the list stays free and open.
