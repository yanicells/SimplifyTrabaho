# SimplifyTrabaho — Product Spec & Implementation Guide

> **Status:** v1 shipped (Phases 0–6 done, site live). v2 approved — see §18 for
> Phases 7–12.
> **Audience:** The AI agent (or human) implementing this project. This document is the
> source of truth for _what_ to build and _why_. Read [CLAUDE.md](../CLAUDE.md) for
> operational rules and [TRACKER.md](../TRACKER.md) for current work state.
> **Last updated:** 2026-06-12

**Naming convention:** the product/display name is **SimplifyTrabaho** (capital S, capital
T) — use it in all user-facing copy: README title, site UI and metadata, docs prose, repo
description. Lowercase `simplifytrabaho` remains correct wherever it is an _identifier_:
the domain (`simplifytrabaho.ycells.com`), package names (npm forbids capitals), the
User-Agent string, folder/repo paths.

---

## 1. Vision

A free, open, automatically updated list of jobs at Philippine companies — **all roles,
all levels, all industries** — with internships and entry-level roles featured front and
center. The Philippine counterpart of
[SimplifyJobs/Summer2026-Internships](https://github.com/SimplifyJobs/Summer2026-Internships).

**Why it should exist:** No PH equivalent exists today (verified 2026-06). PH job seekers
rely on JobStreet/LinkedIn/Indeed, which bury fresh postings under ads and stale listings.
The Simplify repo proved that a transparent, fast, link-out-only aggregator earns massive
trust and adoption. The PH market gap is real.

**What makes it defensible:** The hand-curated **company registry** (which PH companies
exist, which ATS they use, what their board slug is). Everything else is commodity
plumbing. Treat the registry as the crown jewel.

## 2. Blueprint: what we take from SimplifyJobs

Studied 2026-06-11. Their architecture, which we adopt:

| Their pattern                                                                | Our adoption                                                     |
| ---------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Single JSON source of truth (`.github/scripts/listings.json`, ~12 MB)        | `data/listings.json`                                             |
| README tables are **generated** from JSON, never hand-edited                 | Same, via pipeline                                               |
| Listings sourced from company career pages (ATS), NOT from job boards        | Same — public ATS APIs only                                      |
| Minimal data per listing: company, title, location, link, dates, active flag | Same schema, PH-adapted (see §6)                                 |
| Inactive listings kept with `active: false`, never deleted                   | Same                                                             |
| Crowdsourcing via GitHub issues                                              | **Deferred to phase 2** (see ROADMAP.md) — v1 is fully automated |
| Python `list_updater/` package                                               | Replaced with TypeScript (one language across repo)              |

Why their approach is legally sound — and ours stays sound by copying it:

- They pull from **company career pages**, where companies _want_ their jobs seen.
- They store **facts only** (company, title, location, URL, dates). Facts are not
  copyrightable; job-description prose is. They never republish descriptions.
- They always **link out** to the official application page — driving traffic _to_ the
  company, which is why career-page aggregation has no history of takedowns.

## 3. Legal rules (NON-NEGOTIABLE)

These rules exist so the project never gets the maintainer banned, blocked, or sued.
Every implementation decision must comply. If a feature can't be built within these
rules, the feature changes — not the rules.

1. **NEVER scrape or fetch from LinkedIn, JobStreet, Indeed, Kalibrr, Glassdoor, or any
   job board / aggregator.** Their ToS explicitly prohibit it (verified 2026-06).
   JobStreet/SEEK has no public API or open partner program. This includes "just one
   request" and "just for testing."
2. **Only fetch from public, unauthenticated endpoints that the companies' own careers
   pages call from a browser.** Two tiers (see §17): **Tier A** — documented public ATS
   APIs (§5.1), default and unrestricted; **Tier B** — unofficial-but-public endpoints
   (currently Workday only), allowed solely under the §17 guardrails with per-company
   PR review. For both tiers: no authentication bypass, no session spoofing, no CAPTCHA
   solving, no robots.txt violations, no rate-limit or bot-detection evasion of any
   kind. If a host blocks us, we stop — we never work around a block.
3. **Store facts only:** company name, role title, locations, work setup, application
   URL, dates, employment type, salary _if the ATS publishes it in the structured
   feed_. **Never store or republish job-description text.**
4. **Always link out** to the company's official application page. We are a directory,
   not a destination.
5. **Be polite:** ≥1 second delay between requests; identifying User-Agent
   (`simplifytrabaho/<version> (+repo URL)`); scheduled runs at most once daily;
   exponential backoff on 429/5xx; never parallel-hammer one host.
6. **No personal data.** Job postings aren't personal data, but if a feed includes a
   recruiter's name/email, drop those fields at normalization (PH Data Privacy Act,
   RA 10173 — see §13 references).
7. **Honor removal requests.** If a company asks to be delisted, remove them from the
   registry promptly and log it in TRACKER.md. (Expected to be rare — this is free
   advertising for them.)

## 4. Scope

### v1 in scope

- All open roles (any level, any function, tech and non-tech) at registered companies.
- Jobs located in the Philippines **or** remote roles whose published location
  explicitly includes the Philippines (e.g., "Remote — Philippines").
- Six ATS sources: Greenhouse, Lever, Ashby, Workable, SmartRecruiters, Recruitee.
- A curated, verified company registry, target **100+ companies** at launch.
- Daily automated refresh (GitHub Actions) + manual refresh from a laptop.
- Auto-generated README with a curated slice (internships + entry-level).
- A simple, fast, static Next.js website with client-side filters.
- Free hosting (Vercel Hobby tier).

### v1 explicitly OUT of scope (see ROADMAP.md for futures)

- Crowdsourced submissions (no GitHub-issue intake, no forms).
- HTML scraping of career pages without a public API (incl. Workday, Taleo,
  SuccessFactors, custom pages).
- Any job-board sourcing (rule §3.1).
- Accounts, saved searches, alerts, emails, applications-through-us.
- Job description storage or display.
- A database or server backend — everything is static files + git.

### v2 scope (approved 2026-06-12 — see §18 for the phase breakdown)

v2 promotes two things out of the v1 exclusion list, with conditions:

- **Workday** moves in scope as a Tier-B source under the §17 guardrails (it is the
  platform of Globe, GCash/Mynt, Accenture, P&G, and most large PH corporates).
  HTML scraping of custom pages stays out of scope.
- The website grows **client-side product features** (localStorage application
  tracker, saved preferences, support/feedback affordances) — still no accounts, no
  database, no server backend. Anything needing a server (e.g., sending email) stays
  in ROADMAP.md.

Plus: taxonomy v2 (§6/§9), more Tier-A ATSs (§5.1), registry rebalance toward direct
employers (§7), and a maintainer-led reach phase.

## 5. Architecture & repo layout

```
simplifytrabaho/
├── CLAUDE.md              # agent operational guide
├── README.md              # GENERATED by pipeline — never hand-edit
├── TRACKER.md             # work log: done / in progress / issues / decisions
├── ROADMAP.md             # future phases
├── docs/
│   └── SPEC.md            # this file
├── pipeline/              # TypeScript CLI package
│   ├── companies.json     # company registry (hand-curated, see §7)
│   ├── package.json
│   └── src/
│       ├── fetchers/      # one module per ATS (§5.1)
│       ├── normalize.ts   # raw ATS payload → Listing (§6)
│       ├── filter.ts      # PH location filter (§8)
│       ├── categorize.ts  # level + function from title (§9)
│       ├── merge.ts       # dedupe + lifecycle vs existing data (§10)
│       ├── readme.ts      # README generator (§11)
│       └── cli.ts         # orchestrator: `pnpm refresh`
├── data/
│   └── listings.json      # generated source of truth (committed)
└── web/                   # Next.js site (§12)
```

- **pnpm workspace** at the root (`pnpm-workspace.yaml` listing `pipeline` and `web`).
  pnpm only — never npm or yarn anywhere (scripts, docs, CI).
- Root script `refresh` runs the pipeline end-to-end. (Named `refresh` deliberately:
  `update` and `fetch` are pnpm built-ins and must not be used as script names.)
- TypeScript strict mode in both packages. Pipeline and web share the `Listing` type
  (export from pipeline or a tiny shared types file — implementer's choice, but one
  definition only).

### 5.1 ATS fetchers

One module per ATS. Each takes a registry entry, returns raw postings or a typed error.
Known public endpoints (verify exact response shapes against live responses during
implementation, and save one real sample per ATS as a test fixture):

| ATS             | Endpoint (GET, no auth)                                                         |
| --------------- | ------------------------------------------------------------------------------- |
| Greenhouse      | `https://boards-api.greenhouse.io/v1/boards/{slug}/jobs`                        |
| Lever           | `https://api.lever.co/v0/postings/{slug}?mode=json`                             |
| Ashby           | `https://api.ashbyhq.com/posting-api/job-board/{slug}?includeCompensation=true` |
| Workable        | `https://apply.workable.com/api/v1/widget/accounts/{slug}`                      |
| SmartRecruiters | `https://api.smartrecruiters.com/v1/companies/{slug}/postings`                  |
| Recruitee       | `https://{slug}.recruitee.com/api/offers/`                                      |
| BambooHR        | `https://{slug}.bamboohr.com/careers/list`                                      |
| Breezy          | `https://{slug}.breezy.hr/json`                                                 |
| Manatal         | `https://www.careers-page.com/api/v1.0/c/{slug}/jobs/`                          |

**Phase 9 probe verdicts:** Freshteam is **OUT** (no public feed; auth-gated machine
paths and HTML-only public jobs page). BambooHR, Breezy, and Manatal are **IN** as
public, unauthenticated JSON feeds. Personio is **IN but deferred** because its public
feed is XML-based and currently has approximately zero PH employer coverage. Teamtailor,
Jobvite, and Zoho Recruit are **OUT** because they require authorization, issued feed
links, API keys, OAuth, or account-minted credentials.

**Workday is NOT Tier A** — it has its own rules in §17.

Useful field notes (to verify at implementation time):

- Lever provides `workplaceType` (on-site/hybrid/remote) and `createdAt` directly.
- Ashby provides `isRemote`, `publishedAt`, `employmentType`, and structured
  compensation when published.
- Greenhouse basic listing gives `title`, `location.name`, `absolute_url`,
  `updated_at`; a published/created date may require `?content=true` — if so, still
  **discard** the `content` (description) field immediately after reading dates.

Fetcher behavior requirements:

- 404 / "board not found" → report `dead-slug` error for that company; the run
  continues; the company gets flagged (see §10) — a dead slug must never crash a run.
- Timeouts and 5xx → retry with backoff (max ~3 tries), then skip with a logged error.
- Respect rule §3.5 politeness (sequential per host, ≥1s gaps).

## 6. Listing schema

The unit of data. Stored in `data/listings.json` as:

```jsonc
{
  "version": 3, // bumped from 2 when Phase 9 adds companyType
  "updatedAt": "2026-06-11T22:00:00Z", // last successful pipeline run
  "listings": [
    /* Listing[] */
  ],
}
```

Each `Listing`:

| Field            | Type           | Notes                                                                                                                                                                                     |
| ---------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`             | string         | First 12 hex chars of SHA-256 of the canonical application URL. Stable across runs.                                                                                                       |
| `company`        | string         | Display name from the registry (NOT from the ATS payload — keeps naming consistent).                                                                                                      |
| `title`          | string         | **The role title as published**, e.g. "Software Engineering Intern", "Sales Manager", "Junior Accountant". Verbatim from the ATS; no rewriting.                                           |
| `locations`      | string[]       | Raw location strings as published, e.g. `["Manila, Philippines", "Remote - Philippines"]`.                                                                                                |
| `workSetup`      | enum           | `onsite` \| `hybrid` \| `remote` \| `unknown`. From structured ATS fields when available (Lever `workplaceType`, Ashby `isRemote`), else keyword match on location/title, else `unknown`. |
| `level`          | enum           | `internship` \| `entry` \| `mid` \| `senior` \| `unknown` (§9).                                                                                                                           |
| `function`       | enum           | **Schema v2 (Phase 8), 18 SEEK-aligned values:** `engineering` \| `data` \| `design` \| `product` \| `marketing` \| `sales` \| `finance` \| `hr` \| `operations` \| `customer-support` \| `legal` \| `healthcare` \| `education` \| `hospitality` \| `manufacturing` \| `retail` \| `construction` \| `other` (§9). _(Schema v1 had the first 11 + other.)_ |
| `industry`       | string         | **Schema v2 (Phase 8).** Copied from the company's registry entry at normalization (e.g., `fintech`, `outsourcing`). Company-level fact, denormalized for filtering.                      |
| `companyType`    | enum           | **Schema v3 (Phase 9).** `direct` \| `agency`, copied from the company's registry entry at normalization (SPEC §7/§11).                                                |
| `metro`          | string[]       | **Schema v2 (Phase 8).** Normalized PH region tags derived from `locations`: `ncr`, `cebu`, `davao`, `clark-pampanga`, `calabarzon`, `iloilo`, `bacolod`, `baguio`, `cdo`, `remote-ph`, `other-ph`. Keyword map lives next to the PH filter (§8); extend the value list as real locations demand, spec update in the same commit. |
| `url`            | string         | Official application URL on the company's ATS. The only outbound link.                                                                                                                    |
| `source`         | string         | ATS name: `greenhouse`, `lever`, `ashby`, `workable`, `smartrecruiters`, `recruitee`, `bamboohr`, `breezy`, `manatal`.                                                                     |
| `employmentType` | enum           | `full-time` \| `part-time` \| `contract` \| `internship` \| `unknown` — when the ATS provides it.                                                                                         |
| `salary`         | string \| null | Only if published in the structured feed (e.g., Ashby compensation). Verbatim formatted range. Never inferred.                                                                            |
| `datePosted`     | string         | ISO 8601 UTC. From the ATS published/created field when available; otherwise the date our pipeline first saw it. Never changes after first set.                                           |
| `dateUpdated`    | string         | ISO 8601 UTC. Last time we saw this listing change (or its active flag flip).                                                                                                             |
| `active`         | boolean        | `true` while present in the company's feed; `false` once it disappears. Inactive listings are kept forever (history), never deleted.                                                      |

**Forbidden fields (rule §3.3/§3.6):** description/content text, recruiter names or
emails, applicant data of any kind.

## 7. Company registry (`pipeline/companies.json`)

```jsonc
{
  "version": 1,
  "companies": [
    {
      "name": "PayMongo", // display name used in listings
      "ats": "lever", // a supported ATS id (§5.1) or "workday" (§17)
      "slug": "paymongo", // the board token/site name in the ATS URL
      "industry": "fintech", // free-form lowercase tag
      "type": "direct", // v2 (Phase 9): "direct" employer | "agency" (staffing/outsourcing/recruitment)
      "verified": true, // true = endpoint confirmed live with PH roles
      "added": "2026-06-11",
      "notes": "", // optional: e.g. "also hires remote APAC"
    },
  ],
}
```

- A company that uses two ATSs gets **two entries** (same `name`).
- `verified: false` entries are skipped by the pipeline (they're candidates pending
  verification).
- Registry is the ONLY hand-edited data file. Keep it alphabetized by `name`.
- `parseRegistry` requires every company entry to include `type`; missing `type` is a
  registry validation error.
- **`type` (v2, Phase 9):** `agency` = staffing/outsourcing/recruitment firms hiring on
  behalf of clients; `direct` = everyone else. Agencies stay fully listed and
  filterable — their jobs are real — but the README featured table and any "featured"
  surface shows **direct employers only** (§11). When in doubt, check what the company
  sells: if its product is staffing, it's an agency.
- **Governance (v2, Phase 10):** Tier-A companies (documented ATSs) may be added
  directly to main, as today. **Tier-B companies (`ats: "workday"`) enter ONLY via a
  pull request** carrying the §17 verification evidence — never direct to main, even
  by the maintainer's own agent sessions. The PR is the review gate.

### 7.1 Seeding procedure (the first major implementation task)

The registry starts empty. Build it by **research + verification**, never by guessing:

1. **Gather candidates** by category:
   - PH startups & scale-ups: fintech (PayMongo, Mynt/GCash, Maya, First Circle…),
     SaaS (Sprout Solutions…), AI/data (Thinking Machines…), consumer (Kumu…), and
     whatever current research surfaces (YC companies with PH founders/offices,
     recently funded PH startups, tech.in.ph / e27 / TechCrunch coverage).
   - Multinationals with significant PH offices: Canva, Grab, Shopee, global SaaS
     with Manila/Cebu hubs.
   - Large PH corporates beyond tech (healthcare, retail, banking — e.g. Maxicare
     tier) — many won't be on supported ATSs yet; log them as candidates anyway.
   - International remote-friendly companies known to hire in PH (detectable via
     "Remote - Philippines" locations on their boards).
   - **Note:** every name above is a _candidate_, not a fact — company↔ATS mappings
     change. Verification (step 2) is what makes an entry real.
2. **Verify each candidate:** hit each of the six ATS endpoints with plausible slugs
   (company name lowercased, hyphenated variants). An entry is `verified: true` only
   if the endpoint returns HTTP 200 with a valid jobs payload AND at least one role
   passes the PH location filter (§8) — OR the company is PH-headquartered (then keep
   it even if it currently shows zero open PH roles).
3. **Log failures** in TRACKER.md (company, slugs tried, date) so they aren't
   re-researched from scratch. Re-check failed candidates occasionally — companies
   migrate ATSs.
4. **Launch bar:** 100+ verified companies. Then grow continuously; every future
   session can add a few.

## 8. PH location filter

A listing is kept iff at least one location string (case-insensitive) matches:

- Country: `philippines`, `pilipinas`, ` ph` / `(ph)` as a country token (be careful:
  bare "PH" needs word-boundary handling to avoid false positives).
- Metro/city names: `manila`, `makati`, `taguig`, `bgc`, `bonifacio global city`,
  `quezon city`, `pasig`, `ortigas`, `mandaluyong`, `pasay`, `parañaque`/`paranaque`,
  `alabang`, `muntinlupa`, `cebu`, `davao`, `iloilo`, `bacolod`, `baguio`, `clark`,
  `pampanga`, `laguna`, `santa rosa`, `cavite`, `batangas`, `cagayan de oro`.
- Remote markers tied to PH: `remote - philippines`, `remote (philippines)`,
  `philippines - remote`, and equivalents.

Excluded by design: bare `remote`, `remote - apac`, `remote - asia`, `remote -
southeast asia` (can't confirm PH eligibility — revisit in ROADMAP).

Keep the keyword list as a single exported constant so it's easy to extend. Log (to
console, optionally to TRACKER) a sample of _rejected_ location strings per run so
missing keywords get noticed.

## 9. Categorization (level + function)

Keyword heuristics on `title` (case-insensitive), first match wins, `unknown`/`other`
is an acceptable outcome — never guess wildly.

**Level** (check in this order):

1. `internship`: `intern`, `internship`, `ojt`, `on-the-job`, `practicum`, `apprentice`
2. `entry`: `junior`, `jr.`, `jr `, `entry`, `entry-level`, `fresh grad`, `new grad`,
   `graduate`, `trainee`, `cadet` (PH BPO/airline cadetship programs), `associate`
   (only when not preceded by `senior`)
3. `senior`: `senior`, `sr.`, `sr `, `lead`, `principal`, `staff`, `head of`,
   `manager`, `director`, `vp`, `chief`, `officer` (as in C-level)
4. `mid`: only for explicit markers (`mid-level`, `intermediate`, Roman numerals
   `ii`/`iii`). Titles matching none of the above default to `unknown` — never
   assume mid-level from the absence of markers.

**Function (schema v2, Phase 8): 18 values aligned with the SEEK/JobStreet
classification** (<https://developer.seek.com/use-cases/job-posting/job-categories>) —
the taxonomy PH job seekers already know. The 11 v1 functions keep their existing
keyword rules; the 6 new ones cover what `other` was swallowing:

| New function    | Keyword seeds (extend by mining real titles)                                                                  |
| --------------- | ------------------------------------------------------------------------------------------------------------- |
| `healthcare`    | nurse, doctor, physician, medical, clinical, pharmacist, dental, caregiver, midwife, med tech, utilization review |
| `education`     | teacher, tutor, instructor, professor, ESL, curriculum, registrar, trainer (academic context)                   |
| `hospitality`   | chef, cook, barista, waiter, bartender, kitchen, housekeeping, front desk, hotel, restaurant, travel, tour      |
| `manufacturing` | production, machine operator, assembler, quality assurance inspector, plant, welder, technician (plant context), maintenance |
| `retail`        | cashier, store, merchandiser, branch (retail context), shopkeeper, visual merchandising                         |
| `construction`  | civil works, foreman, carpenter, electrician, plumber, mason, site engineer disambiguation note below, surveyor, property, real estate |

Disambiguation rules stay conservative and live with the tables: e.g. "Site Engineer"
and "Civil Engineer" → `construction` only via explicit multi-word rules (bare
`engineer` keeps matching `engineering` first per table order — reorder/special-case
only with a test proving the fix).

These tables WILL be imperfect. Requirements: (a) they live in one file
(`categorize.ts`) as data, not scattered logic; (b) unit tests cover PH-specific cases
(e.g., "OJT", "cadet"); (c) misclassification is a tracker backlog item, not a crash.

**Categorizer tooling (v2, Phase 8) — keywords are an ongoing process, not a one-shot:**

- `pnpm --filter pipeline eval-categorizer`: prints coverage (% of active listings
  with known level / known function) and the top ~50 uncategorized titles by
  frequency. Run it in every refresh summary so drift is visible; keyword additions
  are mined from this output, never invented.
- `pnpm --filter pipeline recategorize`: re-runs categorization (and metro
  derivation) over the ENTIRE existing dataset — including inactive listings — and
  rewrites `listings.json`. Required because the daily merge only touches listings
  present in feeds; without a backfill, improved tables leave history stale. Must
  preserve `datePosted` and not touch `dateUpdated` for category-only changes
  (re-tagging is our metadata, not a change in the listing itself — document this
  in the command's tests).
- **Coverage targets (active listings):** `level: unknown` < 25%, `function: other`
  < 15%. Targets, not laws — never trade accuracy for coverage; `unknown` stays
  better than a wrong guess.

## 10. Merge & lifecycle (each pipeline run)

1. Load existing `data/listings.json` (or empty on first run).
2. Fetch all registered+verified companies (§5.1) → normalize (§6) → PH-filter (§8)
   → categorize (§9). Result: the "current" set.
3. For each current listing: if `id` exists, update `dateUpdated` only when a field
   actually changed; if new, add with `datePosted` per §6.
4. Any existing **active** listing whose company _was fetched successfully this run_
   but which is absent from the current set → `active: false`, `dateUpdated` now.
   **Critical:** if a company's fetch FAILED this run, leave its listings untouched —
   never mass-deactivate because of a transient error.
5. A company hitting `dead-slug` 3 runs in a row → keep its listings frozen, add an
   issue entry to TRACKER.md for human/agent follow-up.
6. Write `listings.json` (stable sort: company asc, then datePosted desc — keeps git
   diffs reviewable), regenerate README (§11).
7. Print a run summary: companies fetched/failed, new/updated/deactivated counts.

## 11. README generation

README.md is fully generated; a hand-edit will be overwritten (the file carries a
header comment saying exactly that).

Contents:

1. Project title, one-line pitch, link to the website, link to ROADMAP/SPEC.
2. "How this works & legal stance" — 3-4 sentences: sourced from public ATS APIs
   companies intentionally publish, facts only, always links to official application
   pages, daily updates.
3. **Featured table: internships + entry-level**, active, `datePosted` within the last
   30 days, sorted newest first, capped at 200 rows. Columns: Company | Role (the
   `title`) | Location | Work Setup | Apply (link) | Posted (e.g. "3d ago").
   **v2 (Phase 9): featured = `type: "direct"` companies only.** Agency listings stay
   in the data and on the site (filterable), but the README's first impression leads
   with recognizable direct employers, not staffing posts.
4. Counts line: total active listings, total companies tracked, last-updated stamp.
5. Pointer: "Full list with filters → website".

## 12. Website (`web/`)

**One page, deliberately simple.** Next.js (current stable major, App Router),
TypeScript, Tailwind. Static export — no server components needed at runtime, no API
routes, no database.

Requirements:

- Reads listings at build time. **Ship only active listings to the client**, and only
  the fields the UI uses — the payload sent to browsers must stay lean even when the
  full dataset grows (split/trim at build; the 12 MB Simplify file is a cautionary
  tale, not a target).
- Header: name ("SimplifyTrabaho"), one-line pitch, GitHub link, last-updated stamp.
- Filter bar: level, function, work setup, location (text contains), free-text search
  over company+title. All client-side. Default view on load: internships + entry-level
  (the featured audience), with one click to "All roles".
- **v2 filter upgrades (Phase 8):** add metro, industry, and employer-type
  (direct/agency) filters; level and function become **multi-select**; the
  search/filter bar is **sticky** while scrolling results; full filter state is
  encoded in **URL query params** (shareable links — pasting a URL reproduces the
  view; also the groundwork for the Phase 12 reach work).
- **v2 product features (Phase 11) — all client-side, localStorage, no accounts:**
  - **Application tracker:** a "Track" affordance beside Apply; tracked listings get a
    status the user can advance (saved → applied → interview → offer / rejected) and a
    "My applications" view. Keyed by listing `id` (stable URL hash). localStorage
    only — device-local, exportable as JSON for portability.
  - **Preferences:** persist the user's default filters (e.g., preferred functions,
    metro, level) so returning visitors land on their view. localStorage; a one-tap
    reset.
  - **Support & feedback:** a navbar button (GitHub issues for feedback + a
    donate/support link) and a gentle, dismissible prompt shown at most after every
    ~5 Apply clicks — with a permanent "don't show again". Exact UX decided in-phase
    with the maintainer; never block the primary job-hunting flow.
  - **PWA baseline:** web manifest + icons so the site is installable; offline
    support is a nice-to-have, not required.
- Listing rows/cards: company, title, locations, workSetup badge, level badge, posted
  "Xd ago", Apply button → official `url` (target=\_blank, `rel="noopener noreferrer"`).
- Thousands of rows must stay smooth: paginate or virtualize — implementer's choice.
- Mobile-first responsive; majority of PH job seekers browse on phones.
- No tracking/analytics in v1 beyond (optionally) privacy-friendly counts; no cookies.
- Design: clean and trustworthy; PH-flavored accents welcome, but clarity over flair.
  Use the `frontend-design` skill when building; follow `vercel-react-best-practices`.

## 13. Automation, deployment & manual ops

### GitHub Actions (free tier)

- Workflow `refresh.yml`: cron daily at `0 22 * * *` UTC (6:00 AM PHT) + manual
  `workflow_dispatch`.
- Steps: checkout → `pnpm/action-setup` → `pnpm install --frozen-lockfile` →
  `pnpm refresh` → if `data/listings.json` or `README.md` changed, commit & push as
  the github-actions bot (workflow needs `permissions: contents: write`).
- A failed run must fail loudly (red X) — no silent skips.

### Vercel (free Hobby tier)

- Import the GitHub repo; root directory `web/`; framework Next.js; pnpm detected via
  lockfile. Every push (Actions bot or human) triggers a deploy.
- Production URL: <https://simplifytrabaho.ycells.com> (custom domain on Vercel).
- Backup documented option: static export to GitHub Pages via a second workflow.

### Manual update from the maintainer's laptop (explicit requirement)

```
git pull
pnpm install
pnpm refresh        # runs the full pipeline locally
git add -A && git commit -m "data: manual refresh" && git push
```

Push → Vercel rebuilds. Identical code path to CI — no special casing.

### Legal references (for the record)

- ATS public APIs overview: https://cavuno.com/blog/ats-platforms-public-job-posting-apis
- Open-source multi-ATS fetcher (reference, not dependency): https://github.com/plibither8/jobber
- Facts vs. copyright in postings: https://www.avvo.com/legal-answers/is-aggregating-job-postings-from-employeer-career--1480697.html
- PH Data Privacy Act (RA 10173): https://privacy.gov.ph/data-privacy-act/
- LinkedIn/Indeed/JobStreet ToS prohibit scraping — do not source from them.

## 14. Testing expectations

- Unit tests: normalization per ATS (against saved real fixtures), PH location filter
  (incl. tricky cases: "Remote - APAC" rejected, "Parañaque" accepted, bare "PH"
  word-boundary), categorizer (PH terms: OJT, cadet, fresh grad), merge lifecycle
  (deactivation, failed-fetch protection, datePosted immutability).
- One end-to-end dry run against 2-3 live verified companies in CI is acceptable but
  must not fail the build on upstream flakiness — mark as advisory.
- The web build must fail if `listings.json` is missing or schema-invalid (catch data
  corruption before deploy).

## 15. Acceptance criteria (v1 "done")

1. `pnpm refresh` on a clean clone completes without errors and produces valid
   `data/listings.json` + regenerated `README.md`.
2. Registry contains ≥100 verified companies spanning ≥2 ATSs; listings include
   internship, entry, and senior roles across tech and non-tech functions.
3. Zero listings from forbidden sources; zero stored job-description text (spot-check).
4. README featured table renders correctly on GitHub and links resolve to official
   application pages.
5. Website deployed on Vercel: loads fast on mobile, filters work, default view is
   internships+entry, links open official application pages.
6. GitHub Actions daily run is green and commits only when data changed.
7. Manual laptop flow (§13) verified once end-to-end.
8. TRACKER.md reflects reality: done items checked, known issues listed.

## 16. Suggested build order (v1 — SHIPPED 2026-06-11)

Phases for the implementing agent (track in TRACKER.md):

- **Phase 0 — Scaffolding:** pnpm workspace, TS configs, lint/format, empty packages.
- **Phase 1 — Pipeline core:** types/schema → fetchers (start with Greenhouse+Lever)
  → normalize → PH filter → categorize → merge → README generator → CLI. Tests along
  the way (TDD per superpowers).
- **Phase 2 — Registry seeding:** research + verify to 100+ companies (§7.1). Start
  this early in parallel — it derisks everything (if PH ATS coverage is thinner than
  expected, we want to know immediately; mitigation: add remaining two ATSs, widen
  candidate list to BPO/corporate brands, document findings in TRACKER).
- **Phase 3 — Remaining fetchers:** Ashby, Workable, SmartRecruiters, Recruitee.
- **Phase 4 — Website:** build against the real listings.json.
- **Phase 5 — Automation:** GitHub Actions, Vercel hookup, end-to-end verification.
- **Phase 6 — Polish & launch:** README copy, badges, acceptance-criteria sweep.

## 17. Workday tier (Tier B — unofficial-but-public, guardrailed)

**Why:** Workday is where the credibility-defining PH employers live — Globe
(`globe.wd3.myworkdayjobs.com/GLB_Careers`), GCash/Mynt (same tenant, site `Mynt`),
Accenture (`accenture.wd103.myworkdayjobs.com/AccentureCareers`), P&G
(`pg.wd5.myworkdayjobs.com/1000`), and most large PH corporates (banks, airlines,
conglomerates — see the TRACKER candidate graveyard).

**What it is:** every public Workday career site is rendered by a JSON endpoint:
`POST https://{tenant}.wd{n}.myworkdayjobs.com/wday/cxs/{tenant}/{site}/jobs` with a
body like `{"appliedFacets":{},"limit":20,"offset":0,"searchText":""}` — the exact
call the page itself makes, no auth. It is **unofficial**: undocumented, tenants can
disable it (401/422), and Workday fronts it with Akamai bot management. That makes it
Tier B: usable, but only under these rules.

### 17.1 Guardrails (non-negotiable, additions to §3)

1. **robots.txt first:** before the first fetch of any tenant, check
   `https://{tenant}.wd{n}.myworkdayjobs.com/robots.txt`. If the jobs paths are
   disallowed for our User-Agent (or `*`), the company is OFF the table — record it
   in TRACKER and move on.
2. **Instant, permanent stop on any block:** a 401/403/422/429 or an Akamai
   challenge page → mark the company `blocked` in TRACKER, skip it for the rest of
   the run and all future runs until a human reviews. NEVER retry around a block:
   no IP rotation, no User-Agent changes, no headless browsers, no cookie replay,
   no third-party "unblocker" services. We are guests; a closed door means no.
3. **Extra politeness:** ≥2s between requests to any Workday host (stricter than
   the ≥1s Tier-A rule), sequential only, pagination capped (stop after the last
   page or 1,000 postings, whichever first), same identifying User-Agent.
4. **Global tenants get location-filtered at the source where possible:** for
   Accenture/P&G-scale tenants, apply the Philippines location facet in
   `appliedFacets` (discover the facet id from the page's own first request) so we
   never bulk-pull a 10,000-job global feed. If faceting fails, cap pages and
   PH-filter locally (§8) as usual.
5. **Same data rules:** facts only (§3.3) — the jobs list response already carries
   title/locations/postedOn/externalPath; **do not** fetch per-job detail pages
   (that's where JD text lives, and it multiplies request volume).
6. **CI degradation is acceptable:** if GitHub Actions runner IPs get blocked but
   local runs work, Workday companies refresh only on the maintainer's manual runs.
   The merge layer (§10.4) already protects their listings from mass-deactivation
   on failed fetches. Never "fix" CI blocking with evasion (see rule 2).

### 17.2 Governance

- Workday companies enter the registry **only via pull request** (§7), one PR per
  company or tenant, carrying: tenant + site id, robots.txt verdict, a trimmed
  sample response (facts only), identity confirmation (it's really that company),
  and the PH posting count found. Direct-to-main additions are forbidden for Tier B.
- Wave 1 (Phase 10): Globe, Mynt/GCash, Accenture (PH facet), P&G (PH facet).
  Wave 2 candidates: the "PH corporates" graveyard in TRACKER (UnionBank, Cebu
  Pacific, Philippine Airlines, San Miguel, URC, Security Bank…) — verify each
  tenant individually.
- If Workday (the vendor) or any tenant company objects or blocks: comply
  immediately, log it, and fall back to ROADMAP partnership routes. Rule §3.7
  (removal requests) applies with zero friction.

## 18. v2 build order (approved 2026-06-12)

Same working agreement as v1: one phase per session/chat, TDD for pipeline logic,
TRACKER.md kept current, verify before claiming done. Phases in order:

- **Phase 7 — Rename:** product name is **SimplifyTrabaho** everywhere user-facing
  (README via `readme.ts`, site UI + metadata/OG, docs prose, SPEC/TRACKER/ROADMAP
  headings). Identifiers stay lowercase (domain, package names, User-Agent, paths).
  Acceptance: grep finds no user-facing lowercase brand usage; site + README render
  the new name; tests green.
- **Phase 8 — Taxonomy v2 + filters:** schema v2 (§6: 18 functions, `industry`,
  `metro`; bump `version` to 2) → categorizer v2 tables (§9) → `eval-categorizer` +
  `recategorize` tools → web filter upgrades (§12: multi-select, metro/industry/
  employer-type, sticky bar, URL params). Web build's schema validation updated in
  the same commit. Acceptance: coverage targets met or gap explained in TRACKER;
  shareable URLs reproduce filter state; payload still lean.
- **Phase 9 — Coverage, Tier A:** Freshteam fetcher first (Thinking Machines PH —
  closes the v1 graveyard entry), then probe/add the §5.1 candidate ATSs that prove
  truly public (fixture + tests each). Registry round 3 targeting **direct
  employers** (rebalance away from the 45-agency skew); add `type` to every
  registry entry; README featured goes direct-only (§11). Acceptance: ≥25 new
  direct employers OR documented evidence the well is dry; agency/direct mix
  reported in TRACKER.
- **Phase 10 — Coverage, Workday tier:** the §17 adapter + guardrails (robots
  check, stop-on-block, facet filtering, politeness), wave-1 companies via
  individual PRs with evidence. Acceptance: Globe + GCash + Accenture-PH + P&G-PH
  listings live (or a documented blocker per company), zero guardrail violations,
  merge protections proven by tests.
- **Phase 11 — Web product features:** §12 v2 product features — tracker,
  preferences, support/feedback affordances, PWA baseline. All client-side; no
  accounts, no backend, no third-party trackers. Acceptance: features work after a
  hard refresh (persistence proven), zero regressions in the core browse→apply
  flow, mobile-first verified via playwright.
- **Phase 12 — Reach & SEO (maintainer-led):** RSS feed(s) generated by the
  pipeline, OG share images, sitemap + per-page metadata, Google Search Console
  setup (maintainer), "copy link to this view" affordance, launch/distribution
  posts (maintainer: r/phcareers, FB groups, university orgs). Email digest:
  start with RSS; evaluate a free newsletter bridge (e.g., Buttondown) — full
  email infrastructure stays in ROADMAP. **The maintainer drives this phase;
  agents prepare, maintainers publish.**
