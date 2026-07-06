# TRACKER — SimplifyTrabaho

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

- [x] 2026-06-11 — **Phase 6 (code side) — polish & acceptance sweep done** (124
      tests green):
  - [x] Categorizer extended with PH vocabulary mined from the live dataset (TDD,
        9 new tests): supervisor/team leader → senior; CSR/TSR/SDR frontline reps →
        entry (checked after senior/mid markers); VA/exec assistant, workforce,
        warehouse, dispatcher → operations; bookkeeping, AP/AR, billing, R2R/P2P,
        fixed asset, estimator → finance; account manager → sales; CX/client
        success → customer-support; sysadmin → engineering; trainer/L&D → hr;
        video editor → design; paid ads/CRM/copywriter → marketing. Active-listing
        counts: `level: unknown` 1,351 → 1,238, `function: other` 825 → 571.
  - [x] README badges (Daily refresh + CI workflow status) via `readme.ts`; legal
        stance copy untouched. Note: badge SVGs 404 for anonymous viewers until
        the repo is public.
  - [x] MIT LICENSE added (code). Listings-data licensing intentionally left as a
        maintainer decision — see Issues.
  - [x] Acceptance-criteria sweep recorded below; live-site playwright pass green.

- [x] 2026-06-12 — **Phase 7 COMPLETE — Rename to SimplifyTrabaho** (126 tests
      green):
  - [x] README generator updated and regenerated via `pnpm refresh`.
  - [x] Site header, metadata, OpenGraph, CLI banner, and docs prose now use
        `SimplifyTrabaho` for the product display name.
  - [x] Lowercase identifiers intentionally left unchanged: domain, package names,
        User-Agent, paths, repo URL/slug.
  - [x] Verified: `pnpm refresh` (101/101 fetched, 0 failed; 2,125 total / 2,093
        active), `pnpm test` (126 tests), `pnpm --filter web build`, and static
        export HTML contains the new title/header/OG site name.

- [x] 2026-06-12 — **Phase 8 COMPLETE — Taxonomy v2 + filters** (198 tests green,
      all pipeline logic TDD):
  - [x] Schema v2 (SPEC §6): `function` → 18 SEEK-aligned values; new `industry`
        (copied from registry at normalization) + `metro` (derived region tags,
        keyword map in `metro.ts` beside the PH filter, mined from the 160 real
        location strings incl. published "Manilla"/"Tauig" misspellings);
        listings.json `version` → 2; web schema validation updated same commit.
  - [x] Categorizer v2 (SPEC §9): six new function tables with conservative
        disambiguation (site/civil/structural engineer → construction pre-rules;
        BPO "Healthcare Account" titles excluded from healthcare; bare
        production/maintenance/technician deliberately unmatched). Two
        eval-driven mining rounds extended the v1 tables (ads, campaign,
        territory, appointment setter, partner solutions, renewals, AML/KYC/
        fraud → legal, risk/underwriting/actuarial/collections/payments →
        finance, artist/creative → design, MDM/BI → data, service desk/client
        service → customer-support, back office/VA/driver ops → operations…).
        Level: `-Mid`/`(MID)` rungs (never "Mid Shift"), trailing roman `I` →
        entry, "lead generation" no longer a leadership marker.
  - [x] `pnpm --filter pipeline eval-categorizer` (coverage % + top-50
        uncategorized, also printed in every refresh summary) and
        `pnpm --filter pipeline recategorize` (full-dataset backfill incl.
        inactive; v1→v2 migration path; preserves datePosted; never bumps
        dateUpdated for category-only changes — all tested).
  - [x] Backfill run (2,125 listings: 318 function / 46 level changes) +
        live refresh. **Coverage on actives: function other 27.3% → 13.7%
        (target <15% MET) · level unknown 59.1% → 58.3% (target <25% NOT met —
        see Issues; accuracy not loosened).**
  - [x] Web (SPEC §12 v2): multi-select level/function chips, metro + industry
        filters, sticky filter rail (advanced panel overlays the list on
        phones), full filter state in URL query params (codec unit-tested;
        no params = featured default, `level=all` = unfiltered, junk dropped).
        Employer-type filter built but hidden until Phase 9 adds registry
        `type`. Payload 792 KB raw / ~97 KB gzipped at 2,080 actives (+~6 KB
        gzipped over v1 for the two new fields).
  - [x] Playwright-verified on the static export, desktop + 390px: all filters,
        multi-select combos, sticky-on-scroll, reset, no horizontal overflow,
        0 console errors, pasted URLs reproduce the exact view.

## ✅ Acceptance criteria sweep (SPEC §15) — 2026-06-11

- [x] 1. `pnpm refresh` clean run — this session: 101/101 fetched, 0 failed, exit 0;
      valid listings.json (2,121 total / 2,097 active) + README regenerated. CI runs
      the same on a clean clone daily (bot commits prove it).
- [x] 2. Registry 101/101 verified spanning all six ATSs (workable 48, sr 15, gh 14,
      ashby 12, lever 10, recruitee 2); active listings span internship 27 / entry
      234 / senior 578 and tech (eng 310, data 104) + non-tech (finance 242, ops 238,
      sales 172, support 114) functions.
- [x] 3. Spot-check script over all 2,121 listings: 0 non-ATS sources, 0 forbidden
      hosts (every URL on official ATS/company career domains), exact schema keys,
      0 fields >250 chars (no JD text), 0 emails, 0 HTML fragments.
- [x] 4. README featured table regenerates as valid GFM (82 rows, 30-day window);
      3 sampled Apply links returned HTTP 200 on official ATS pages; GitHub render
      confirmed by maintainer on prior commits (same generated format).
- [x] 5. Live site playwright pass (prod, simplifytrabaho.ycells.com): default view
      "Interns & fresh grads" (210 roles), All roles → 2,096, multi-word search,
      location filter, function/setup selects present, Apply links → official ATS
      pages, 390px mobile no horizontal overflow, 0 console errors/warnings.
- [x] 6. Daily Actions run green & committing: two `data: daily refresh` commits by
      github-actions[bot] in git history (scheduled runs succeeded and pushed); the
      always-commits-when-green behavior is documented in the decision log. (API
      check not possible anonymously while the repo is private.)
- [x] 7. Manual laptop flow verified end-to-end — maintainer 2026-06-11; this
      session repeated pull → refresh → commit → push locally.
- [x] 8. TRACKER.md reflects reality — this update.

## 🔨 In progress

(nothing code-side — Phase 6 code work done; launch checklist below is on the
maintainer)

**Maintainer launch checklist (the only remaining v1 steps):**

1. **Make the repo public** — it is still private (GitHub API 404s it anonymously;
   it's absent from yanicells's public repo list). README badges and the GitHub
   links on the site 404 for visitors until then.
2. Set the repo **description**, e.g.: "🇵🇭 Free, auto-updated list of jobs at
   Philippine companies — internships & fresh grads featured. Facts only, straight
   from official company ATS APIs. Refreshed daily." and **website**
   <https://simplifytrabaho.ycells.com>.
3. Set **topics**, e.g.: `philippines`, `jobs`, `internships`, `entry-level`,
   `fresh-graduates`, `job-search`, `careers`, `job-listings`, `open-data`,
   `typescript`, `nextjs`.

Registry growth is continuous (SPEC §7.1): web-search the six ATS-hosted domains for
PH city strings → add slugs to `pipeline/candidates.json` → `pnpm --filter pipeline
verify-registry`. Also recheck the live-but-0-PH boards listed below — several
(Deel, Kraken, Reddit, ClickUp-style remote employers) post PH roles periodically.

## ✅ v1 build order (SPEC §16) — complete except repo publish

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

- [x] Acceptance-criteria sweep (SPEC §15) — see sweep section above
- [x] README copy/badges review — badges added, copy reviewed (legal section kept)
- [ ] Publish repo — **maintainer action**, see launch checklist above

## ⏭️ Next up (v2 build order — SPEC §18, approved 2026-06-12)

### Phase 7 — Rename to SimplifyTrabaho

- [x] `readme.ts`: README title/copy → SimplifyTrabaho (regenerate via `pnpm refresh`)
- [x] Site UI + metadata/OG (`layout.tsx`, header component) → SimplifyTrabaho
- [x] Docs prose sweep (SPEC/TRACKER/ROADMAP headings done 2026-06-12; verify rest)
- [x] Keep identifiers lowercase: domain, package names, User-Agent, paths

### Phase 8 — Taxonomy v2 + filters — ✅ COMPLETE 2026-06-12 (see Done)

- [x] Schema v2 in SPEC §6 order: `function` → 18 SEEK-aligned values, add
      `industry` (from registry) + `metro` (derived), bump listings.json `version` to 2
- [x] Categorizer v2 tables (SPEC §9: healthcare, education, hospitality,
      manufacturing, retail, construction) — TDD, conservative disambiguation
- [x] `pnpm --filter pipeline eval-categorizer` (coverage % + top-50 uncategorized)
- [x] `pnpm --filter pipeline recategorize` (full-dataset backfill incl. inactive;
      preserves datePosted, doesn't bump dateUpdated for category-only changes)
- [x] Web: multi-select level/function chips, metro + industry filters, sticky
      filter bar, full filter state in URL params (employer-type filter built but
      hidden until Phase 9 ships registry `type` — flag in job-board.tsx)
- [x] Web build schema validation updated same commit; payload still lean
- [x] Coverage targets: function other <15% met (13.7%); level unknown <25% NOT
      met (58.3%) — gap explained in Issues, accuracy not traded for coverage

### Phase 9 — Coverage, Tier A + registry rebalance — **COMPLETE 2026-07-06**

- [x] ~~Freshteam fetcher~~ **CUT** — Freshteam has no public unauthenticated feed
      (`/api/job_postings` → 401, `.json` → OAuth redirect, `/jobs` is HTML-only);
      extracting = HTML scraping = out of scope. Thinking Machines stays unreachable
      under our rules. Kumu (bamboohr:kumu) closes the graveyard-proof role instead.
- [x] Probe candidate ATSs (SPEC §5.1): BambooHR ✅ IN, Breezy ✅ IN, Manatal ✅ IN,
      Personio ⚠️ deferred (public but XML + EU-centric), Freshteam/Teamtailor/
      Jobvite/Zoho Recruit ❌ OUT (auth-gated). Three new fetchers + normalizers,
      TDD with real fixtures (JD text stripped).
- [x] Registry: `type: direct|agency` on all entries (106 companies:
      56 direct / 50 agency; borderline flips per maintainer: Arcanys, Hello Rache,
      SupportYourApp, Tech Firefly, Xillium → agency)
- [x] README featured table → direct employers only (SPEC §11)
- [x] Registry round 3: **5 new direct employers landed** (Kumu + Expedock via
      BambooHR; BillEase, CloudEats, Eskwelabs via Manatal) — the ≥25 target hit a
      dry well: most graveyard names are simply not on any public-feed ATS. The
      recognizable-employer gap is structural and is what Phase 10 (Workday) exists
      to close.
- [x] Schema v3 shipped: `companyType` denormalized onto every listing (precedent:
      `industry` in v2); `recategorize` is the v2→v3 migration; web validates v3 and
      the employer-type filter is live (URL param `type`).

### Phase 10 — Coverage, Workday tier (SPEC §17)

- [ ] Workday fetcher with ALL §17.1 guardrails (robots.txt gate, stop-on-block
      with TRACKER flag, ≥2s politeness, pagination cap, location facets for
      global tenants, jobs-list only — never job detail pages)
- [ ] Guardrails proven by tests (blocked-response fixtures → permanent skip)
- [ ] Wave 1 via individual PRs with §17.2 evidence: Globe (GLB_Careers),
      Mynt/GCash (Globe tenant, site Mynt), Accenture (wd103, PH facet),
      P&G (wd5, PH facet)
- [ ] Wave 2 candidates from the PH-corporates graveyard below (UnionBank, Cebu
      Pacific, PAL, San Miguel, URC, Security Bank…) — tenant-by-tenant

### Phase 11 — Web product features (client-side only)

- [x] 2026-07-06 — Application tracker: bookmark button per row, status flow
      (saved → applied → interview → offer / waitlisted / rejected), "My jobs"
      view with per-row status select + remove, localStorage
      (`st:tracker:v1`, lenient parse — corrupt entries dropped), JSON export.
      Tracked jobs keep a company/title snapshot so they survive listings going
      inactive ("No longer listed" tag).
- [x] 2026-07-06 — Preferences: filters persist via localStorage
      (`st:filters:v1`, reuses the URL codec so junk is validated for free);
      pasted URL always wins over the saved state; Reset clears both.
- [ ] Support & feedback: navbar button (GitHub issues + donate link), dismissible
      prompt at most every ~5 Apply clicks with permanent opt-out — UX co-designed
      with maintainer in-phase
- [x] 2026-07-06 — PWA baseline: manifest.ts + SVG icon (ink square, PH-sun
      mark). PNG icon sizes pending real branding assets.
- [x] No accounts, no backend; analytics is Vercel Analytics (cookieless,
      maintainer-requested — see Decisions); core apply flow regression-free
      (233 tests green, playwright-style preview verified)

### Phase 12 — Reach & SEO (maintainer-led; agents prepare, maintainer publishes)

- [x] 2026-07-06 — RSS feed: `/feed.xml` (newest 100, facts only, official apply
      links), generated at web build from listings.json
- [x] 2026-07-06 — OG share image (build-time ImageResponse), sitemap.xml,
      robots.txt, expanded metadata (keywords, twitter card, RSS alternate),
      JSON-LD (WebSite + SearchAction on `?q=`, CC0 Dataset), `llms.txt`
- [x] 2026-07-06 — "Copy link to this view" affordance (next to Reset filters)
- [ ] Google Search Console — **maintainer**
- [ ] Newsletter bridge evaluation (e.g., Buttondown over RSS) — recommend, don't build
- [ ] Launch/distribution posts (r/phcareers, FB groups, university orgs) — **maintainer**

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
- 2026-06-11 — [resolved] `level: unknown` / `function: other` backlog: keyword
  tables extended with PH vocabulary mined from the live dataset (frequency-ranked
  titles). Active listings: unknown 1,351 → 1,238, other 825 → 571. The remaining
  unknowns are by design — unleveled titles like "PHP Developer" stay unknown per
  SPEC §9 (never guess). Future tuning is continuous work, driven by new titles.
- 2026-06-11 — [open] **Repo is still private** — publishing it is the last launch
  step (maintainer-only). Badges/GitHub links 404 for visitors until flipped.
- 2026-06-11 — [resolved] **Data licensing decision**: maintainer chose CC0 1.0 for
  the datasets (`data/listings.json`, `pipeline/companies.json`); MIT stays for the
  code. `data/LICENSE` added with the CC0 text + a preamble (compilation of public
  facts; postings remain the companies' property/responsibility; attribution
  appreciated, not required). README now carries a License section.
- 2026-06-12 — [open] **Level-unknown coverage is 58.3% vs the <25% Phase 8
  target — the gap is structural, not a keyword shortfall.** Per eval-categorizer,
  the unknown mass is dominated by genuinely unleveled titles ("PHP Developer" ×8,
  "Graphic Designer" ×6, "Bookkeeper" ×4, "Recruiter" ×4 …) that carry no level
  marker at all; SPEC §9's own rule ("never assume mid-level from the absence of
  markers") forbids leveling them. Everything minable was mined this phase
  (`-Mid`/`(MID)` rungs, trailing roman I, lead-generation fix): 59.1% → 58.3%.
  Closing the remaining ~33 points would require guessing, trading accuracy for
  coverage — explicitly the wrong trade per SPEC §9. Recommendation: revisit the
  target itself in a SPEC update, or accept that level-unknown represents
  "open-to-multiple-levels" titles (the web's All-roles view already surfaces them).
- 2026-06-12 — [open] Taxonomy backlog from the 13.7% function-other tail (mined,
  deliberately NOT mapped — no honest bucket in the 18): agriculture/farm roles
  (Pilmico swine/poultry, ~15 actives), laboratory/science analysts (SGS, ~12),
  bare "Business Analyst", "Project Manager" (standing decision), BPO
  quality-systems titles. Revisit if SEEK-alignment ever adds buckets.
- 2026-06-12 — [open] Metro backlog: Tarlac/Central-Luzon locations (~30 actives)
  have no metro tag and fall to `other-ph` alongside bare-"Philippines" listings
  (884 actives). If Central Luzon volume grows, add a tag per SPEC §6 (value-list
  change requires a SPEC update in the same commit).
- 2026-06-12 — [open] Level-marker quirk inherited from v1: `staff` is a senior
  marker (for "Staff Engineer"), so PH rank-and-file titles like "Housekeeping
  Staff" read as senior. Conservative fix needs a test-proven disambiguation
  (staff+engineer/scientist only?) — backlog, low volume.

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
- Kumu — kumu (greenhouse, lever, workable, ashby) ➜✅ bamboohr:kumu (Phase 9)
- SafetyCulture — safetyculture (greenhouse, lever)
- Sprout Solutions — sproutsolutions, sprout-solutions (greenhouse); sprout (lever)
  ➜✅ workable:sprout-solutions
- First Circle — firstcircle (greenhouse, lever); firstcircle (recruitee)
  ➜✅ workable:first-circle
- Thinking Machines (PH) — thinkingmachines, thinking-machines (lever);
  greenhouse:thinkingmachines is the US AI lab (see Issues) — no public board found.
  2026-07: found on Freshteam but Freshteam has **no public feed** (auth-gated +
  HTML-only) → unreachable under our rules; partnership/PR is the only path
- ShopBack — shopback (lever, greenhouse) · Tyme — tyme (lever) ➜✅ GoTyme via
  workable:gotyme-ph-philippines · Athena — athena, athenago (lever); athena (ashby)
- Coda Payments — codapayments, coda (greenhouse) · SupportNinja — supportninja
  (greenhouse, lever) · Ninja Van — ninja-van (lever) ➜✅ lever:ninjavan
- Fintech/startups: BillEase (gh, lever) ➜✅ manatal:billease · ErudiFi (gh, lever) · Tonik — tonik
  (lever), tonikbank (gh) · PDAX (lever, workable) · NextPay (lever, ashby) ·
  GrowSari (gh, lever, workable) · SariSuki (lever, workable) · CloudEats (lever,
  workable) ➜✅ manatal:cloudeats · Packworks (lever, workable) · Expedock (gh,
  ashby) ➜✅ bamboohr:expedock · Locad (ashby,
  workable) · Voyager Innovations (gh) · Tala (gh) · Aspire (gh) · Sleek (lever) ·
  Paymentwall (lever) · Bybit (lever) · Mober (workable) · Transportify (workable) ·
  Edukasyon.ph (workable: edukasyon, edukasyon-ph) · Eskwelabs (workable)
  ➜✅ manatal:eskwelabs ·
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
- 2026-06-11 — Categorizer PH-vocabulary extension (deviations/judgment calls, all
  TDD-tested): `supervisor`/`leader` count as senior (PH BPO team-management roles;
  `\bleader\b` doesn't match "Leadership Development Program"); CSR/TSR/SDR
  frontline-rep titles are entry by PH market convention, checked AFTER senior/mid
  so "Senior CSR" → senior and "CSR II" → mid; `account manager` → sales (TAMs
  included — standard org placement); `estimator` → finance (cost-estimation
  roles); "Project Manager" deliberately stays `other` (no PM bucket in the enum —
  guessing operations would be wrong).
- 2026-06-11 — License: MIT for code (maintainer pre-approved "likely MIT").
- 2026-06-11 — Data licensing: CC0 1.0 for the datasets, MIT for the code
  (maintainer decision). Rationale: this is a facts-only dataset — claiming
  attribution rights over facts would contradict our own legal stance that facts
  carry no copyright. Attribution requested informally, never required.
- 2026-06-11 — `refresh.yml` commit guard checks `data/listings.json`/`README.md`
  per SPEC §13, but every successful run rewrites `updatedAt` in both, so a green
  run always commits. Intentional: the daily commit keeps the site dateline fresh,
  triggers the daily Vercel redeploy, and carries `data/fetch-state.json` along so
  dead-slug streak counts (3-strikes rule, SPEC §10.5) persist across CI runs.
  Don't "optimize" the timestamp away without rethinking all three.
- 2026-06-12 — **v2 approved** (maintainer + planning session; SPEC §18). Driving
  insight: registry is agency-heavy (45/101 outsourcing/staffing) and the
  credibility-defining employers (Globe, GCash, Accenture, P&G, big corporates) are
  on Workday — coverage credibility, not plumbing, is the gap.
- 2026-06-12 — Product name is **SimplifyTrabaho** (capital S/T) in all user-facing
  copy; lowercase stays for identifiers (domain, package names, User-Agent, paths).
- 2026-06-12 — **Workday greenlit as Tier B** with SPEC §17 guardrails: robots.txt
  gate per tenant, instant permanent stop on any block, zero evasion ever, ≥2s
  politeness, jobs-list only (never job detail pages — that's where JD text lives),
  companies enter via PR only. Research: Globe = globe.wd3/GLB_Careers, GCash =
  same tenant /Mynt, Accenture = accenture.wd103, P&G = pg.wd5 (global tenants need
  PH location facets).
- 2026-06-12 — Thinking Machines PH found on **Freshteam**
  (thinkingmachines.freshteam.com/jobs) — first Phase 9 target; v1's correct
  rejection of greenhouse:thinkingmachines (US AI lab) stands.
- 2026-06-12 — Taxonomy v2: `function` expands to 18 SEEK/JobStreet-aligned values
  (+healthcare, education, hospitality, manufacturing, retail, construction);
  levels unchanged. New listing fields `industry` (from registry) and `metro`
  (normalized region tags). Schema version → 2 when Phase 8 lands.
- 2026-06-12 — Registry rebalance: add `type: direct|agency`; agencies stay listed
  and filterable, but featured surfaces (README table) show direct employers only.
- 2026-06-12 — Web product features approved for Phase 11 (tracker, preferences,
  support/feedback prompts, PWA baseline) — all client-side/localStorage, no
  accounts/backend. Email updates deferred: RSS first (Phase 12), free newsletter
  bridge evaluated then; full email infra stays ROADMAP.
- 2026-06-12 — Reach & SEO is Phase 12 and **maintainer-led** (user wants direct
  involvement); agents prepare artifacts, maintainer publishes.
- 2026-06-12 — **Phase 8 schema/tooling decisions:**
  - `parseListingsFile` (pipeline + web) accepts ONLY v2; `recategorize` is the
    designated v1→v2 migration path (reads raw v1/v2, rewrites v2). A pre-migration
    `pnpm refresh` fails loudly instead of limping on mixed schemas.
  - `METRO_TAGS` lives in `types.ts` (not `metro.ts`): the web bundler can't
    resolve NodeNext `.js` relative imports, and types.ts has no runtime imports —
    keyword map + `deriveMetro` stay beside the PH filter in `metro.ts`.
  - recategorize never bumps per-listing `dateUpdated` NOR file-level `updatedAt`
    (re-tagging is our metadata; updatedAt = last pipeline run, and a refresh
    always follows the backfill anyway).
  - `industry`/`metro` ARE merge-compared fields (a real feed/registry change
    bumps dateUpdated on daily runs — only the backfill is exempt).
  - eval-categorizer measures the tables AS CODE (re-runs categorize over active
    titles) rather than reading stored categories — that's what mining needs, and
    post-refresh the stored state matches the tables anyway.
- 2026-06-12 — **Phase 8 categorizer judgment calls** (all test-pinned):
  veterinarians → healthcare (closest of the 18; SEEK's farming bucket doesn't
  exist here) · property/real-estate → construction (SPEC §9 seed list) · bank
  "Branch Manager" → retail (branch is a SPEC seed; defensible either way) ·
  risk/underwriting/actuarial/collections/payments/trading → finance ·
  fraud/AML/KYC/transaction monitoring → legal (compliance family; "Fraud Risk"
  hits finance first by table order — fine) · BPO "Healthcare Account" suffix
  excluded from healthcare (it names the client's industry, not the role) ·
  "Medical VA"/"Virtual Nurse" pre-rules beat the operations VA rule.
- 2026-06-12 — **Phase 8 web decisions:**
  - URL state contract: no params = featured default; `level=all` marks the
    unfiltered view; multi-values comma-joined in canonical order; junk values
    dropped silently (links get mangled by chat apps). Codec in
    `web/lib/filter-params.ts`, unit-tested.
  - Static export keeps prerendering the featured default (fast first paint for
    the majority no-param visit); pasted-URL state applies right after hydration
    via one mount effect — accepted tradeoff over a Suspense/CSR boundary that
    would blank the list for everyone. URL writes are debounced
    `history.replaceState` (Safari rate-limits it; no history spam).
  - Sticky rail: on phones the advanced panel is an absolute overlay under the
    rail (rail stays 127px stuck); in-flow on sm+.
  - Employer-type filter shipped dark behind `EMPLOYER_TYPE_FILTER_ENABLED=false`
    in job-board.tsx; flip when Phase 9 adds registry `type` (URL param `type`
    reserved).
- 2026-07-06 — **Phase 9 decisions (executed 2026-07-02..06):**
  - Schema v3: `companyType: direct|agency` denormalized onto every listing at
    normalization (precedent: `industry` in v2). Field named `companyType` on
    listings (registry keeps bare `type`) to avoid overloading `type` (Q4).
  - Freshteam **cut** (Q1): no public unauthenticated feed — `/api/job_postings`
    401, `.json` OAuth redirect, `/jobs` HTML-only. Thinking Machines PH stays
    unreachable under our rules; Kumu (bamboohr:kumu) is the graveyard-closer.
  - Personio **deferred** (Q2): feed is public but XML (pipeline speaks JSON) and
    EU-centric (~0 PH employers). Revisit only if a PH employer surfaces on it.
  - Teamtailor / Jobvite / Zoho Recruit **OUT**: all auth-gated (API key/OAuth).
  - Borderline classifications (Q3, maintainer-confirmed): Arcanys, Hello Rache,
    SupportYourApp, Tech Firefly, Xillium → **agency**; final split 56 direct /
    50 agency across 106 companies.
  - Round-3 (Q5): dry well documented — 5 net-new direct employers (Kumu,
    Expedock via BambooHR; BillEase, CloudEats, Eskwelabs via Manatal). Most
    graveyard names aren't on any public-feed ATS; the recognizable-employer gap
    is Workday-shaped (Phase 10).
  - BambooHR/Breezy redirect-on-unknown-tenant handled via opt-in
    `redirectIsNotFound` in the polite HTTP layer (default behavior for the six
    v1 fetchers unchanged); Manatal 404s unknown slugs; all three treat
    live-empty as a successful empty fetch.
- 2026-07-06 — **Web v2 (redesign + Phase 11/12 slice, maintainer-directed):**
  - Visual system swapped to an Uber-Base-inspired black/white duet
    (`web/DESIGN.md`, via `getdesign add uber`): Inter replaces Fraunces +
    Instrument Sans, warm-cream palette dies, black is the only conversion
    color, every interactive element is a pill, container widened
    max-w-3xl → max-w-6xl, footer is the page's single polarity-flip black
    band. The PH flag strip + sun-yellow micro-accents (New badge, count
    badges, OG highlight) are the sole chromatic marks — the PH identity IS
    the accent.
  - Tracker statuses extend the SPEC flow with `waitlisted`
    (saved → applied → interview → offer/waitlisted/rejected) per maintainer
    request. Identity key is the listing URL (same as the React key).
  - **Vercel Analytics added on explicit maintainer request.** It is
    cookieless and stores no personal data, so the footer promise was
    reworded "no tracking" → "no cookies" to stay honest. The Phase 11
    "no third-party trackers" clause is superseded by this decision.
  - Filter persistence stores the URL-codec string, not a parallel format —
    one validator, no schema drift.
  - SEO/AEO: JSON-LD advertises the `?q=` SearchAction and the CC0 dataset;
    `llms.txt` points answer engines at listings.json + feed.xml. Google
    Search Console verification remains maintainer-side (Phase 12).
