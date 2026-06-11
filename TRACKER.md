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
- [x] 2026-06-11 — **Phase 2 COMPLETE — 101 verified companies (≥100 launch bar
      met)**, spanning all six ATSs. Built `verify-registry` tool (candidates.json →
      probe → PH-check → merge into companies.json + TRACKER-format failure lines);
      ~200 candidates probed across 13 rounds. Final `pnpm refresh`: 101/101
      fetched, 0 failures, ~17.5k postings → **2,097 PH listings** committed.
      Sources: workable ~900, smartrecruiters ~650, lever 385, greenhouse 137,
      ashby 50, recruitee 4. Every PH-HQ zero-posting entry identity-confirmed via
      the Workable account-name field.
- [x] 2026-06-11 — Filter bug found via real data & fixed (TDD): Vietnamese "Thành
      phố" matched bare-PH token because JS `\b` mistreats accented letters; replaced
      with Unicode lookaround boundaries. Dataset rebuilt clean (37 false positives
      removed; everything was first-seen same day, so the rebuild lost nothing).

- [x] 2026-06-11 — **Phase 4 COMPLETE — website built and verified** (112 tests green
      across workspace):
  - [x] Data layer (TDD, 23 tests): `web/lib/listings.ts` reads `data/listings.json`
        at build, schema-validates (missing file / bad JSON / bad enum all verified
        to fail `next build` with a named field), ships active listings only with 9
        UI fields, day-precision dates, PH locations ordered first. Payload: 691 KB
        raw / ~91 KB gzipped at 2,097 listings.
  - [x] One-page UI per SPEC §12: Fraunces/Instrument Sans "broadsheet" look, PH
        flag strip + sun-yellow accents, level chips (default = interns & fresh
        grads, one tap to All roles), function/work-setup selects, 
        location-contains + tokenized free-text search (all client-side), Show 
        more pagination with `content-visibility` rows, Apply → official URL with 
        `target=_blank rel="noopener noreferrer"`, last-updated dateline, GitHub links.
  - [x] Playwright-verified on the built static export, desktop + 390px mobile:
        default featured view (208 roles), every filter, multi-word search, empty
        state + reset, Show more (60→120 of 2,097), apply link opened the official
        SmartRecruiters posting in a new tab; no console errors; no horizontal
        overflow on mobile.

- [x] 2026-06-11 — **Phase 5 (repo side) — automation files built and verified**:
  - [x] `.github/workflows/refresh.yml` per SPEC §13: daily cron `0 22 * * *` UTC
        (6 AM PHT) + `workflow_dispatch`, `permissions: contents: write`,
        pnpm/action-setup + Node 22 + `--frozen-lockfile`, `pnpm refresh`,
        commit-as-github-actions-bot only when `data/listings.json`/`README.md`
        changed (`data/` staged so `fetch-state.json` rides along), 30-min timeout,
        concurrency guard, no error suppression (any failed step = red X).
        YAML parse-validated with js-yaml.
  - [x] Website URL switched to <https://simplifytrabaho.ycells.com> everywhere:
        `pipeline/src/readme.ts` (README regenerated via `pnpm refresh`),
        `web/app/layout.tsx` (`metadataBase` + canonical + OpenGraph, verified
        present in the static export HTML), SPEC §13 Vercel section.
  - [x] Verified end-to-end: `pnpm refresh` 101/101 fetched 0 failed (2,115
        listings, 2,094 active) · 112 tests green · `pnpm --filter web build` green.

## 🔨 In progress

(nothing — Phases 0–5 done and live-verified; next is Phase 6, polish & launch)

Registry growth is continuous (SPEC §7.1): web-search the six ATS-hosted domains for
PH city strings → add slugs to `pipeline/candidates.json` → `pnpm --filter pipeline
verify-registry`. Also recheck the live-but-0-PH boards listed below — several
(Deel, Kraken, Reddit, ClickUp-style remote employers) post PH roles periodically.

## ⏭️ Next up (v1 build order — SPEC §16)

### Phase 5 — Automation

- [x] GitHub Actions `refresh.yml` (daily cron 22:00 UTC, workflow_dispatch, pnpm,
      commit-if-changed, contents: write) — see Done
- [x] Vercel project hookup (root `web/`) — maintainer deployed; custom domain
      <https://simplifytrabaho.ycells.com> live with DNS (2026-06-11)
- [x] First live Actions run verified green — maintainer confirmed 2026-06-11
      (run surfaced a Node 20 deprecation warning; fixed, see Issues)
- [x] Bot data commit triggers a Vercel production deploy — maintainer confirmed
      2026-06-11
- [x] Manual laptop flow (SPEC §13) verified once end-to-end — maintainer
      confirmed 2026-06-11

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
- 2026-06-11 — [resolved] First live "Refresh listings" run warned: "Node.js 20
  actions are deprecated" (GitHub forces Node 24 on runners starting 2026-06-16,
  removes Node 20 2026-09-16). Bumped `actions/checkout`, `actions/setup-node`,
  `pnpm/action-setup` from @v4 to @v6 in both workflows — all three v6 majors
  declare `node24`, and checkout v6 still defaults `persist-credentials: true`
  (the bot push in refresh.yml relies on it).
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

- Rounds 10–13 (PH BPO slug guessing): dead — MicroSourcing, Select VoiceCom,
  SixEleven, VirtualStaff.ph, Boomering, Frontline Accounting, Tahche, The Virtual
  Hub, Vault Outsourcing, Intogreat, Payreto, The Back Room, TOA Global (lever),
  Limitlessli, Remote Staff, MCVO Talent, OfficePartners360 (op360 ×2), OneCoreDev,
  Awesome CX, PartnerHero (gh), Carousell (lever), ClickUp (lever) · live-but-0-PH —
  DCX, Premier Media, Probe Group, WeAssist, TaskBullet, Sagan, Remote Workmate,
  Peak Support, Gear Inc, Elevate and Delegate, Bold Business, Connext, CloudTask,
  Extenteam, Anytime Mailbox

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
  return 200 + `jobs: []` (a successful empty fetch); unknown accounts get a real 404. 
  Several PH-HQ outsourcing firms sit in this empty state — kept as verified
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
- 2026-06-11 — Web payload approach: trimmed jobs inlined as RSC props at build
  (no client fetch); 9 fields, day-precision `posted`, salary omitted when null.
  691 KB raw / ~91 KB gzipped at 2,097 listings — revisit (e.g. client-side fetch of
  a split JSON) only if the dataset grows several-fold.
- 2026-06-11 — Level filter UI = single-select chips; the default "Interns & fresh
  grads" chip is internship ∪ entry, satisfying SPEC §12's featured default with
  one-tap "All roles". Mid/Senior/Internships/Entry reachable individually;
  unknown-level rows appear only under "All roles".
- 2026-06-11 — Pagination ("Show more", 60/page) + `content-visibility: auto` rows
  instead of virtualization — simpler, SSR-friendly, smooth at 2k rows.
- 2026-06-11 — Free-text search is tokenized AND-match over company+title (multi-word
  queries like "software intern" failed as a single substring — caught by playwright
  verification).
- 2026-06-11 — Display-only reorder of `locations`: PH locations first (reusing
  pipeline `isPhilippineLocation`) so they never hide behind the "+N" truncation on
  multi-country roles. Facts unchanged, order only.
- 2026-06-11 — Relative "Xd ago" stamps are computed against the dataset's
  `updatedAt`, not `Date.now()`, so the static export renders identically on server
  and client (no hydration mismatch) and never goes stale mid-day.
- 2026-06-11 — Production URL is <https://simplifytrabaho.ycells.com> (custom domain
  on the maintainer's Vercel project); the vercel.app URL is retired. Single source
  in `pipeline/src/readme.ts` (`WEBSITE_URL`) for the README; `web/app/layout.tsx`
  (`SITE_URL`) for canonical/OG metadata.
- 2026-06-11 — `refresh.yml` commit guard checks `data/listings.json`/`README.md`
  per SPEC §13, but every successful run rewrites `updatedAt` in both, so a green
  run always commits. Intentional: the daily commit keeps the site dateline fresh,
  triggers the daily Vercel redeploy, and carries `data/fetch-state.json` along so
  dead-slug streak counts (3-strikes rule, SPEC §10.5) persist across CI runs.
  Don't "optimize" the timestamp away without rethinking all three.
