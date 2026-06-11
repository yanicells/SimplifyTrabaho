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

- [x] 2026-06-11 — Phase 3 complete: Ashby, Workable, SmartRecruiters, Recruitee
      fetchers + normalizers, each with a real sanitized fixture + tests (89 tests
      green). SR fetcher paginates (limit 100) and treats empty results as dead-slug
      (SR returns 200 for unknown companies). Workable live-account-with-0-jobs =
      successful empty fetch.
- [x] 2026-06-11 — Phase 2 (bulk): `verify-registry` tool (candidates.json → probe →
      PH-check → merge into companies.json + TRACKER-format failure lines).
      ~150 candidates probed across 9 rounds; **88 verified companies** spanning all
      six ATSs. Full `pnpm refresh`: 88/88 fetched, 0 failures, 17k postings →
      **2,040 PH listings** committed. Sources: workable 847, smartrecruiters ~650,
      lever 385, greenhouse 137, ashby 50, recruitee 4.
- [x] 2026-06-11 — Filter bug found via real data & fixed (TDD): Vietnamese "Thành
      phố" matched bare-PH token because JS `\b` mistreats accented letters; replaced
      with Unicode lookaround boundaries. Dataset rebuilt clean (37 false positives
      removed; everything was first-seen same day, so the rebuild lost nothing).

## 🔨 In progress

- Phase 2 — grow registry 88 → 100+ verified (SPEC §7.1 launch bar). Process that
  works: web-search the six ATS-hosted domains for PH city/“Philippines” strings →
  drop found slugs into `pipeline/candidates.json` → `pnpm --filter pipeline
  verify-registry`. Search engines were the bottleneck today (result saturation),
  not the tooling — fresh queries on another day will surface new boards.

## ⏭️ Next up (v1 build order — SPEC §16)

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

- 2026-06-11 — [resolved] Bare-PH token matched Vietnamese "Thành phố" (JS `\b` vs
  accented letters) → Bosch Vietnam interns leaked into the featured table. Fixed
  with Unicode lookaround boundaries in `filter.ts` + regression tests; dataset
  rebuilt (37 bad listings purged before they ever shipped).
- 2026-06-11 — [resolved] Wrong-company registry entries from generic slugs +
  PH-HQ rule: `lever:maya` (a San Francisco firm, not the PH fintech),
  `greenhouse:thinkingmachines` (Thinking Machines **Lab**, the US AI startup, not
  the Manila data consultancy), `workable:bbgc` (SG/Dubai commodity consultancy),
  `workable:atticus` (unconfirmable vs US legal-tech Atticus). All four removed.
  verify-registry now prints a CONFIRM-IDENTITY warning for any PH-HQ verification
  with 0 PH postings.
- 2026-06-11 — [open] `level: unknown` on 1,332/2,040 listings (by design — SPEC §9
  never guesses) and `function: other` on 829. Backlog: extend keyword tables from
  real titles (e.g., PH BPO vocabulary: "CSR", "TSR", "Team Leader", "Workforce").

<!-- Format: - 2026-06-12 — [open|resolved] Short description. Context/link. -->

## 🗂️ Registry: failed/pending candidates

All probed 2026-06-11 unless noted. Companies later verified under another slug/ATS
are marked ➜✅. PH corporates (banks, conglomerates, airlines, food) are mostly on
Workday/custom portals — none of the guessed SmartRecruiters identifiers existed.

**Live board, 0 PH roles today — recheck periodically (companies known to hire PH):**
- Deel — deel (ashby) · Pearl Talent — pearl (ashby) · Persona — persona (ashby) ·
  Catena — catena (ashby) · Kraken — kraken.com (ashby) · Kittl — kittl (ashby) ·
  Pareto.AI — pareto-ai (ashby) · Flagright — flagright.com (ashby) ·
  Supabase — supabase (ashby) · Zip — zip (ashby) · Payabli — payabli (ashby) ·
  OnePay — oneapp (ashby) · Traba ➜✅ (1 PH role found on later run)
- OKX — okx (greenhouse) · Canonical — canonical (greenhouse; uses "Home based -
  APAC" strings we exclude by design) · Binance — binance (greenhouse, 0 jobs) ·
  Reddit — reddit (greenhouse) · dbt Labs — dbtlabsinc (greenhouse) ·
  Helium 10 — helium10 (greenhouse) · InfoTrust — infotrust (greenhouse) ·
  Magic — magic (greenhouse, 0 jobs) · Lingaro — Lingaro (smartrecruiters) ·
  Ubisoft — Ubisoft2 (smartrecruiters) · WTW — WTW (smartrecruiters) ·
  Doka/Umdasch — UmdaschGroup (smartrecruiters) · Jetfuel — Jetfuelagency (smartrecruiters)
- Betr — betr (lever) · Luxury Presence — luxurypresence (lever) ·
  InDebted — indebted (lever) · Time Doctor — timedoctor (recruitee)
- Workable live-but-empty, not PH-HQ: bruntwork, cleardesk, doxa-talent, medva,
  oradian, superstaff, helpware, hammerjack, wing-assistant (Wing ➜✅ via
  lever:getwingapp), boldr, bywave, everise, overshore, optibpo, legalmatch,
  easyship-4, keywords-studios, side, uscreen, wrkpod, 20four7va, acquirebpo,
  bgc-group-1, cos (ConnectOS), pineapple-staffing, quickteam ➜✅ later run

**Dead slugs (404 / unknown identifier):**
- Canva — canva, canvacareers (greenhouse); canva (lever) ➜✅ smartrecruiters:Canva
- PayMongo — paymongo (lever, greenhouse, workable, ashby) — no public board found
- Mynt/GCash — mynt, gcash (greenhouse); mynt (lever, ashby)
- Maya — maya (greenhouse); lever:maya exists but is a US company (see Issues)
- Kumu — kumu (greenhouse, lever, workable, ashby)
- SafetyCulture — safetyculture (greenhouse, lever)
- Sprout Solutions — sproutsolutions, sprout-solutions (greenhouse); sprout (lever)
  ➜✅ workable:sprout-solutions
- First Circle — firstcircle (greenhouse, lever); firstcircle (recruitee)
  ➜✅ workable:first-circle
- Thinking Machines (PH) — thinkingmachines, thinking-machines (lever);
  greenhouse:thinkingmachines is the US AI lab (see Issues) — no public board found
- ShopBack — shopback (lever, greenhouse) · Tyme — tyme (lever) ➜✅ GoTyme via
  workable:gotyme-ph-philippines · Athena — athena, athenago (lever); athena (ashby)
- Coda Payments — codapayments, coda (greenhouse) · SupportNinja — supportninja
  (greenhouse, lever) · Ninja Van — ninja-van (lever) ➜✅ lever:ninjavan
- Fintech/startups: BillEase (gh, lever) · ErudiFi (gh, lever) · Tonik — tonik
  (lever), tonikbank (gh) · PDAX (lever, workable) · NextPay (lever, ashby) ·
  GrowSari (gh, lever, workable) · SariSuki (lever, workable) · CloudEats (lever,
  workable) · Packworks (lever, workable) · Expedock (gh, ashby) · Locad (ashby,
  workable) · Voyager Innovations (gh) · Tala (gh) · Aspire (gh) · Sleek (lever) ·
  Paymentwall (lever) · Bybit (lever) · Mober (workable) · Transportify (workable) ·
  Edukasyon.ph (workable: edukasyon, edukasyon-ph) · Eskwelabs (workable) ·
  Edamama (workable, recruitee) · Zennya — zennya (lever), zennya-health (workable)
- Outsourcing/staffing: Booth & Partners (workable ×2) · GoTeam (workable) ·
  SupportZebra (workable) · Filta (workable, recruitee) · Intelassist (workable) ·
  Genfinity (workable) · The Remote Group (workable) · Remotify (workable,
  recruitee) · FullSuite (workable) · Symph (workable, recruitee) · Mosaic
  Solutions (workable) · Cobena (workable) · TaskDrive (workable) · RemoteVA
  (workable) · Virtual Coworker (recruitee) · Cloud Employee (recruitee) · Beepo
  (recruitee) · Adaca (recruitee) · Shae Group (workable) · Maria Health (workable) ·
  Medgate (workable) · Tier One Entertainment (workable) · Secret 6 (workable) ·
  StackTrek (workable) · Boldr (recruitee) · Athena (lever ×2)
- Internationals: ClickUp (gh) · Thunder (gh) · Klook (lever) · SiteMinder (gh,
  lever) · TaskUs (gh, lever) · ModSquad (lever) · PartnerHero (lever) · Somewhere —
  supportshepherd, somewhere (lever) · Omnipresent (lever) · PressReader (lever) ·
  OpenPhone (ashby) · Loop Support (ashby) · Assistantly (ashby) · Multiplier
  (ashby) · Invisible Tech (ashby) · Veed (ashby) · Clipboard Health —
  clipboardhealth (ashby) ➜✅ ashby:clipboard · Oyster (ashby) · SafetyWing (ashby) ·
  Welocalize — welocalize (lever) ➜ Welo Global ✅ lever:weloglobal · Horizons (gh) ·
  AirAsia (gh) · Keywords Studios (gh) · Carousell (gh) · Damstra (smartrecruiters) ·
  NCS (smartrecruiters) · DXC — DXCTechnology16 (smartrecruiters) · Fresenius —
  FreseniusMedicalCare (smartrecruiters) · Majorel, Mondelez, JTI, Datacom, Emerson,
  Infosys BPM (smartrecruiters)
- PH corporates (all smartrecruiters guesses, all dead — they're on Workday/custom):
  UnionBank, Aboitiz Power, Cebu Pacific, Philippine Airlines, San Miguel, Universal
  Robina, Monde Nissin, NutriAsia, Alaska Milk, Century Pacific, Del Monte PH,
  Robinsons Land, JG Summit, Filinvest · SecurityBank, Zalora, Transcom, Ubiquity,
  TOA Global (smartrecruiters — 200-empty, unknown identifiers)

**Skipped on quality grounds:** usasurveyjob / TowardJobs (lever) — survey-gig mill,
not a real employer. Kalibrr — job-board company, fetching prohibited by rule §1.

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
- 2026-06-11 — SmartRecruiters returns 200 + totalFound:0 for UNKNOWN companies, so
  the SR fetcher treats empty results as dead-slug: a renamed identifier freezes the
  company's listings instead of mass-deactivating them. Cost: a real company with
  temporarily zero postings also freezes — acceptable trade-off.
- 2026-06-11 — Workable widget API: live accounts with no published widget jobs
  return 200 + `jobs: []` (a successful empty fetch); unknown accounts get a real
  404. Several PH-HQ outsourcing firms sit in this empty state — kept as verified
  per SPEC §7.1 (PH-HQ rule) so their future postings flow in automatically.
- 2026-06-11 — Identity rule added after the lever:maya incident: a PH-HQ
  verification with 0 PH postings requires manually confirming the board belongs to
  the intended company (Workable exposes the account name; for others check posting
  locations/titles). verify-registry warns on every such case.
- 2026-06-11 — Quality bar for the registry: no survey/gig mills (usasurveyjob
  rejected), staffing/BPO firms allowed (they're the PH market's reality and their
  postings are real jobs).
- 2026-06-11 — SR posting URLs are constructed as
  `jobs.smartrecruiters.com/{identifier}/{postingId}` (verified live, returns 200) —
  the postings API itself has no public job-ad URL field.
