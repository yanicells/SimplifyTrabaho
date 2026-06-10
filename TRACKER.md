# TRACKER — simplifytrabaho

> Live work log. Every working session: update sections, check off items, log issues
> and decisions with dates. This file is the agent's memory between sessions.
> Spec: [docs/SPEC.md](docs/SPEC.md) · Rules: [CLAUDE.md](CLAUDE.md)

## ✅ Done

- [x] 2026-06-11 — Research: SimplifyJobs repo architecture, ATS public APIs, legal
      landscape (job-board ToS, PH law, copyright-of-facts).
- [x] 2026-06-11 — Design approved; SPEC.md, CLAUDE.md, TRACKER.md, ROADMAP.md written.
- [x] 2026-06-11 — Phase 0 scaffolding: pnpm workspace, `pipeline/` (TS strict, vitest,
      tsx, prettier), `web/` (Next 16 + Tailwind 4, `output: "export"` verified building),
      CI workflow skeleton (`.github/workflows/ci.yml`).
- [x] 2026-06-11 — Phase 1 pipeline core, all TDD (65 tests green):
  - [x] `Listing` + registry types (SPEC §6–7) in `pipeline/src/types.ts`
  - [x] Greenhouse fetcher + real Xendit fixture + tests
  - [x] Lever fetcher + real Ninja Van fixture (JD text truncated before commit) + tests
  - [x] Normalizers (drop forbidden fields — tested that no JD text passes through)
  - [x] PH location filter + tests (Parañaque, bare-"PH"/Memphis boundary, APAC reject)
  - [x] Categorizer + tests (OJT, cadet, fresh grad, Senior Associate, HR Officer)
  - [x] Merge/lifecycle + tests (deactivation, failed-fetch protection, datePosted
        immutability, reactivation, stable sort)
  - [x] README generator + tests (30-day window, 200 cap, generated-file warning)
  - [x] CLI `pnpm refresh` verified end-to-end live: 182 postings → 15 PH listings
        from Xendit + Ninja Van; listings.json + README.md written

## 🔨 In progress

- Phase 2 — registry seeding toward 100+ (16 candidates probed so far: 2 verified,
  14 dead — see failed candidates below).

## ⏭️ Next up (v1 build order — SPEC §16)

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

- Canva — slugs tried: canva, canvacareers (greenhouse); canva (lever) — 2026-06-11 — all 404
- PayMongo — paymongo (lever) — 2026-06-11 — 404
- Mynt/GCash — mynt, gcash (greenhouse) — 2026-06-11 — 404
- Maya — maya (greenhouse) — 2026-06-11 — 404
- Kumu — kumu (greenhouse, lever) — 2026-06-11 — 404
- SafetyCulture — safetyculture (greenhouse) — 2026-06-11 — 404
- Sprout Solutions — sproutsolutions, sprout-solutions (greenhouse); sprout (lever) — 2026-06-11 — 404
- First Circle — firstcircle (greenhouse, lever) — 2026-06-11 — 404
- Thinking Machines — thinkingmachines, thinking-machines (lever) — 2026-06-11 — 404
- Boldr — boldr (lever) — 2026-06-11 — 404
- ShopBack — shopback (lever) — 2026-06-11 — 404
- Tyme/GoTyme — tyme (lever) — 2026-06-11 — 404
- Athena — athena (lever) — 2026-06-11 — 404
- Coda Payments — codapayments, coda (greenhouse) — 2026-06-11 — 404
- SupportNinja — supportninja (greenhouse) — 2026-06-11 — 404
- Ninja Van — ninja-van (lever) 404, but ninjavan (lever) ✅ verified

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
- 2026-06-11 — Categorizer deviation from SPEC §9 keyword list: bare "officer" is NOT
  a senior marker (PH titles like "HR Officer" are staff-level; SPEC's own
  parenthetical says officer means C-level, which "chief" already catches).
- 2026-06-11 — Greenhouse basic jobs endpoint already returns `first_published`, so
  `?content=true` is never needed — JD text is never even fetched.
- 2026-06-11 — Lever fixture committed with JD fields truncated (rule §3.3 — no JD
  text in the repo); structure kept so tests prove the normalizer drops those fields.
- 2026-06-11 — Dead-slug streak state lives in `data/fetch-state.json` (not in
  listings.json — SPEC §6 schema untouched); pipeline prints a TRACKER-ISSUE line
  when a slug 404s 3 runs in a row (SPEC §10.5).
