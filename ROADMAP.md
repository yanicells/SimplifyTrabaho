# ROADMAP — simplifytrabaho

Future additions, in rough priority order. Nothing here is in scope for v1 — see
[docs/SPEC.md](docs/SPEC.md) §4 for the v1 boundary. When a phase starts, move it into
TRACKER.md as tasks and (if needed) extend the SPEC first.

## Phase 2 — Community & coverage

- **Crowdsourced submissions** (the Simplify flywheel): GitHub issue forms for
  "add a company" / "add a listing" / "report a dead link", with a validation bot that
  verifies the ATS endpoint before a maintainer merges. Crowdsourcing was deliberately
  excluded from v1 (user decision, 2026-06-11) — revisit once the automated pipeline
  is stable and the repo has an audience.
- **More ATS platforms with public feeds**: evaluate Teamtailor, Personio, Breezy,
  BambooHR, Jobvite, Pinpoint — add any with documented public posting endpoints.
- **Workday support**: many large PH employers (banks, BPOs, conglomerates) run
  Workday, which has predictable-but-unofficial JSON endpoints behind career pages.
  Gray area: evaluate legal posture carefully before building; document findings.
- **Polite HTML scraping** of major PH employers' own career pages without any ATS
  feed (robots.txt-respecting, low frequency, facts only). Bigger coverage (BPOs,
  conglomerates, government GOCC career pages), but fragile and gray — needs explicit
  go/no-go decision per the legal rules in CLAUDE.md.

## Phase 3 — Partnerships (the truly clean path to job-board data)

- **Kalibrr partnership outreach**: PH-native ATS/job board. An official API/data
  agreement would unlock a huge slice of the PH market legally. Cold-email-able.
- **JobStreet/SEEK partner program inquiry**: no open API exists (verified 2026-06),
  but a formal partnership ask costs nothing.
- **Direct employer opt-in**: a simple "want your jobs listed? add your ATS slug via
  PR/form" page — employers submitting themselves is the cleanest data source there is.

## Phase 4 — Product features

- Job alerts: RSS feed first (trivial from listings.json), then email/Telegram digest.
- Saved filters via URL params (shareable links like `/?level=internship&fn=engineering`).
- Trends page: postings over time, top hiring companies, function mix (all derivable
  from the never-deleted listings history).
- Salary visibility: surface structured salary data where ATSs publish it (Ashby
  already supported in v1 schema); PH salary-transparency push.
- i18n touches: Taglish UI copy option.

## Phase 5 — Scale & ops

- Data growth: shard listings.json (per-year archives like Simplify's `archived/`)
  when git diffs get heavy.
- Search service or prebuilt index if client-side filtering hits limits.
- Status/health page for the pipeline (last run, per-company failures).
- Multiple maintainers / org move; contribution guide (CONTRIBUTING.md).

## Explicit non-goals (unless something big changes)

- Scraping LinkedIn/JobStreet/Indeed/Glassdoor/Kalibrr without an agreement — never.
- Hosting application flows (we always link out; we never collect applicant data).
- Paid features that gate the core list — the list stays free and open.
