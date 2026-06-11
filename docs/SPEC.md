# simplifytrabaho — Product Spec & Implementation Guide

> **Status:** Approved design, pre-implementation.
> **Audience:** The AI agent (or human) implementing this project. This document is the
> source of truth for _what_ to build and _why_. Read [CLAUDE.md](../CLAUDE.md) for
> operational rules and [TRACKER.md](../TRACKER.md) for current work state.
> **Last updated:** 2026-06-11

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
2. **Only fetch from documented public ATS endpoints** (§5) — the same unauthenticated
   JSON endpoints the companies' own careers pages call from a browser. No
   authentication bypass, no session spoofing, no CAPTCHA solving, no robots.txt
   violations, no rate-limit evasion.
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
  "version": 1,
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
| `function`       | enum           | `engineering` \| `data` \| `design` \| `product` \| `marketing` \| `sales` \| `finance` \| `hr` \| `operations` \| `customer-support` \| `legal` \| `other` (§9).                         |
| `url`            | string         | Official application URL on the company's ATS. The only outbound link.                                                                                                                    |
| `source`         | string         | ATS name: `greenhouse`, `lever`, `ashby`, `workable`, `smartrecruiters`, `recruitee`.                                                                                                     |
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
      "ats": "lever", // one of the six supported ATS ids
      "slug": "paymongo", // the board token/site name in the ATS URL
      "industry": "fintech", // free-form lowercase tag
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

**Function:** keyword table mapping title terms → function, e.g. `engineer`,
`developer`, `devops`, `qa`, `sre` → `engineering`; `data`, `analytics`, `machine
learning`, `ai ` → `data`; `designer`, `ux`, `ui` → `design`; `product manager`,
`product owner` → `product`; `marketing`, `seo`, `content`, `social media` →
`marketing`; `sales`, `account executive`, `business development` → `sales`;
`accountant`, `finance`, `treasury`, `audit` → `finance`; `recruiter`, `hr`, `people`,
`talent` → `hr`; `operations`, `supply chain`, `logistics`, `admin` → `operations`;
`support`, `customer success`, `csr` → `customer-support`; `legal`, `compliance`,
`counsel` → `legal`; else `other`.

These tables WILL be imperfect. Requirements: (a) they live in one file
(`categorize.ts`) as data, not scattered logic; (b) unit tests cover PH-specific cases
(e.g., "OJT", "cadet"); (c) misclassification is a tracker backlog item, not a crash.

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
- Header: name, one-line pitch, GitHub link, last-updated stamp.
- Filter bar: level, function, work setup, location (text contains), free-text search
  over company+title. All client-side. Default view on load: internships + entry-level
  (the featured audience), with one click to "All roles".
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

## 16. Suggested build order

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
