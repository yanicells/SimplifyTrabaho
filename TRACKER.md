# TRACKER — simplifytrabaho

> Live work log. Every working session: update sections, check off items, log issues
> and decisions with dates. This file is the agent's memory between sessions.
> Spec: [docs/SPEC.md](docs/SPEC.md) · Rules: [CLAUDE.md](CLAUDE.md)

## ✅ Done

- [x] 2026-06-11 — Research: SimplifyJobs repo architecture, ATS public APIs, legal
      landscape (job-board ToS, PH law, copyright-of-facts).
- [x] 2026-06-11 — Design approved; SPEC.md, CLAUDE.md, TRACKER.md, ROADMAP.md written.

## 🔨 In progress

(nothing yet — implementation not started)

## ⏭️ Next up (v1 build order — SPEC §16)

### Phase 0 — Scaffolding
- [ ] pnpm workspace (`pnpm-workspace.yaml`, root package.json with `refresh` script)
- [ ] `pipeline/` package: TS strict config, test runner, lint/format
- [ ] `web/` package: Next.js + TS + Tailwind, static export config
- [ ] `.gitignore`, base CI workflow skeleton

### Phase 1 — Pipeline core
- [ ] `Listing` + registry types matching SPEC §6–7 (single shared definition)
- [ ] Greenhouse fetcher (+ real-response fixture + tests)
- [ ] Lever fetcher (+ fixture + tests)
- [ ] Normalizer (per-ATS raw → Listing; drops forbidden fields)
- [ ] PH location filter (SPEC §8) + tests (Parañaque, bare-"PH" boundary, APAC reject)
- [ ] Categorizer level+function (SPEC §9) + tests (OJT, cadet, fresh grad)
- [ ] Merge/lifecycle (SPEC §10) + tests (deactivation, failed-fetch protection)
- [ ] README generator (SPEC §11)
- [ ] CLI orchestrator: `pnpm refresh` end-to-end with run summary

### Phase 2 — Registry seeding (start early, parallel with Phase 1)
- [ ] Research candidate PH companies by category (SPEC §7.1)
- [ ] Verification script/process: try slugs across 6 ATS endpoints
- [ ] Reach 100+ verified companies; log failed candidates below

### Phase 3 — Remaining fetchers
- [ ] Ashby · [ ] Workable · [ ] SmartRecruiters · [ ] Recruitee (each + fixture + tests)

### Phase 4 — Website
- [ ] One-page UI per SPEC §12 (filters, featured default view, mobile-first)
- [ ] Lean client payload (active listings only, trimmed fields)
- [ ] Build-time schema validation of listings.json

### Phase 5 — Automation
- [ ] GitHub Actions `refresh.yml` (daily cron 22:00 UTC, workflow_dispatch, pnpm,
      commit-if-changed, contents: write)
- [ ] Vercel project hookup (root `web/`)
- [ ] Verify manual laptop flow (SPEC §13) once end-to-end

### Phase 6 — Polish & launch
- [ ] Acceptance-criteria sweep (SPEC §15)
- [ ] README copy/badges review · publish repo

## 🐞 Issues & blockers

(none yet)

<!-- Format: - 2026-06-12 — [open|resolved] Short description. Context/link. -->

## 🗂️ Registry: failed/pending candidates

(none yet)

<!-- Format: - CompanyName — slugs tried: a, b (ats names) — date — result/notes -->

## 📔 Decision log

- 2026-06-11 — Scope: all jobs, all levels, all industries at tracked companies;
  internships+entry featured. (User decision; future = ROADMAP.)
- 2026-06-11 — Sources: public ATS APIs ONLY for v1. No job boards ever (ToS). No
  HTML/Workday scraping in v1 (ROADMAP phase 2 candidate).
- 2026-06-11 — PH definition: PH-located + explicit "Remote - Philippines". Broad
  APAC-remote excluded.
- 2026-06-11 — Website-first; README carries a curated internships+entry slice
  (30 days, cap 200 rows).
- 2026-06-11 — Stack: TypeScript end-to-end; pnpm only (never npm/yarn); pipeline
  script named `refresh` (pnpm built-in collision with `update`/`fetch`).
- 2026-06-11 — Data: facts only, no JD text, link out always; listings never deleted
  (active flag); registry is the only hand-edited data file.
