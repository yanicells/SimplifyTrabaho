# HANDOFF — SimplifyTrabaho

> **What this is.** A cross-session onboarding brief written 2026-06-16 to hand the
> project off to a fresh Claude Code instance (the maintainer is switching devices).
> It captures the **vision, goals, decisions, working style, and — most importantly —
> the pending/future work**, so a cold agent can get the full picture without re-reading
> every past chat. v1 is shipped and live; the detail here leans toward what's *next*.
>
> **Read order for a new agent:** this file → [CLAUDE.md](../CLAUDE.md) (non-negotiable
> rules) → [SPEC.md](SPEC.md) (the PRD) → [TRACKER.md](TRACKER.md) (live work
> log + full decision log + candidate graveyard) → [docs/plans/phase-9-plan.md](docs/plans/phase-9-plan.md)
> (the next thing to build). This handoff **summarizes and points**; those files are the
> source of truth. Where they disagree with this doc, they win — but this doc carries
> context (the *why*, the maintainer's intent) that isn't fully in them.

---

## 1. The vision — what this project is and wants to be

SimplifyTrabaho is **a free, open, auto-updated list of jobs at Philippine companies** —
all roles, all levels, with internships & entry-level featured by default. It's the PH
counterpart of [SimplifyJobs/Summer2026-Internships](https://github.com/SimplifyJobs/Summer2026-Internships),
which the maintainer chose deliberately as the blueprint because (1) it already works and
(2) it's legally clean. We copy their *architecture and legal posture*, not their code,
and adapt it to the PH market.

**The maintainer's framing, in their own words (from the planning "hub chat"):**

- "main inspo is the simplify jobs repo … make it PH focused."
- Scope grew from internships-only to **all jobs, all levels, all industries** (not just
  tech) — "You are fable 5, you can do a lot of things." Internships + fresh-grad/entry
  stay *featured* because entry-level hunting is the bigger PH pain point.
- **No crowdsourcing in v1** — "maybe in the future but rn no." Data comes only from
  endpoints companies themselves publish.
- Free, open, mobile-first (PH users are mobile-heavy), auto-updated daily.
- **Follow industry standards** like SimplifyJobs / LinkedIn / JobStreet for taxonomy,
  filters, and UX — without ever fetching from those boards.

**The driving motivation for v2 (this is the north star — internalize it):** after v1
shipped and worked, the maintainer said:

> "i feel like we can do better — mainly for the companies and listings. like i was a tad
> bit disappointed? i feel like this is just another project, it won't reach people. i
> feel like it is not yet enough."

So the gap isn't the plumbing (that works). The gap is **coverage credibility and reach**:
the registry is agency-heavy and is missing the recognizable employers PH job-seekers
actually search for (Globe, GCash, Accenture, P&G, Thinking Machines, the big
conglomerates), and there's no distribution path yet for real people to find the site.
**Everything in v2 (Phases 9–12) exists to close that gap.** When prioritizing or making
judgment calls, optimize for: *more recognizable direct employers, better categorization
that matches what users expect, and features/reach that get this in front of PH job
seekers* — while never bending the legal rules.

---

## 2. The maintainer — who you're working with and how they work

- A solo developer. Treats the docs as the contract: "everything is in the doc, and the
  ai just codes." Wants the SPEC detailed enough that an agent can build features from a
  goal/purpose without re-deciding scope.
- **Working rhythm:** there's one **"hub chat"** used purely for planning, grounding, and
  generating the copy-paste prompt for each phase. Each phase is then executed in its own
  **fresh, cold session** by pasting that prompt. The hub chat is where almost every
  decision and plan originated — it is the most context-rich conversation in the project's
  history.
- **On the new device they can't use Fable**, so they now drive multi-step work with
  **Claude's workflow feature**: a phase is split into separate prompts —
  **Plan → Implement → Review → Finalize** — sent one per message, in order, in the same
  chat. (Phase 9's four-stage prompt set was already written this way; see §5.) A new
  agent should be comfortable both *executing* a stage and *producing* the next-stage
  prompt when asked.
- **Wants to be personally involved** in the reach/SEO work (Phase 12) and in co-designing
  the support/feedback UX (Phase 11) — agents prepare artifacts, the maintainer publishes
  and makes the human/marketing calls.
- **Values:** honesty and verification over optimistic claims ("Verify before claiming
  done"); conservative categorization (unknown beats a wrong guess); pnpm-only discipline;
  TDD for all pipeline logic; the legal rules as absolutely non-negotiable.
- Environment notes from past sessions: Windows + PowerShell. `gh` is **not authenticated**
  (use the public GitHub REST API anonymously for read-only checks). Vercel/account/DNS
  steps are done by the maintainer in the browser — **don't attempt Vercel CLI or
  dashboard automation.**

---

## 3. Non-negotiable rules (legal) — never violate, never "just this once"

These are from [CLAUDE.md](../CLAUDE.md) §"Golden rules". Restated here because they gate
*every* future phase, especially Workday (Phase 10):

1. **NEVER** fetch from LinkedIn, JobStreet, Indeed, Kalibrr, Glassdoor, or any job
   board/aggregator. Their ToS prohibit it.
2. Only **public, unauthenticated** endpoints the companies' own careers pages call:
   - **Tier A** = documented ATS APIs (SPEC §5.1). May land **direct to main**.
   - **Tier B** = Workday, ONLY under SPEC §17 guardrails (robots.txt check first; instant
     permanent stop on any block; never evade — no IP/UA rotation, no headless browsers).
     Companies enter **via PR only**, one per company, with §17.2 evidence.
   - No auth bypass, no robots.txt violations, no rate-limit/bot-detection evasion, ever,
     on any tier. **HTML scraping is out of scope** (this is why Freshteam was cut — see §5).
3. **Store facts only:** company, title, locations, URL, dates, work setup, structured
   salary. **NEVER** store job-description text. **NEVER** store personal data (drop
   recruiter names/emails at normalization).
4. Always link out to the official application page.
5. Politeness: ≥1s between requests (≥2s for Workday), identifying User-Agent
   `simplifytrabaho/<version> (+repo URL)`, max one scheduled full run per day.

If a future request seems to require breaking one of these, **stop and surface it** — the
maintainer's whole positioning depends on this posture being airtight.

---

## 4. Where things stand (as of 2026-06-16)

- **Live and shipped.** Site at <https://simplifytrabaho.ycells.com> (Vercel, custom
  domain). Repo `yanicells/SimplifyTrabaho`. Daily GitHub Actions refresh runs at
  **22:00 UTC = 6:00 AM PHT** and auto-commits data as the `github-actions[bot]`.
- **Data:** ~101 verified companies across six Tier-A ATSs (Greenhouse, Lever, Ashby,
  Workable, SmartRecruiters, Recruitee); ~2,100 active PH listings (the exact count drifts
  every daily refresh). `data/listings.json` is **schema v2** today (Phase 9 bumps it to v3).
- **Phases complete:** 0–6 (v1 — pipeline, website, automation, polish, CC0 data license /
  MIT code), **7** (rename to SimplifyTrabaho), **8** (taxonomy v2: 18 SEEK-aligned
  functions + `industry` + `metro`, multi-select/URL-state filters, eval + recategorize
  tooling). ~198 tests green at end of Phase 8.
- **Phase 9 — in progress: PLAN ONLY done.** The implementation plan is written and
  committed (`f5dd79c` → [docs/plans/phase-9-plan.md](docs/plans/phase-9-plan.md)). **No
  Phase 9 code is written yet.** This is the next thing to build (see §5).

### Two open *maintainer* to-dos that are still not done (not agent work)

1. **The repo is still PRIVATE.** This is the last v1 launch step. Until it's public, the
   README status badges and the site's GitHub links **404 for every visitor**. (Maintainer:
   GitHub → Settings → General → Change visibility.)
2. Set the repo **description**, **website** (`https://simplifytrabaho.ycells.com`), and
   **topics** (`philippines`, `jobs`, `internships`, `entry-level`, `fresh-graduates`,
   `job-search`, `careers`, `job-listings`, `open-data`, `typescript`, `nextjs`).

---

## 5. PENDING WORK — the v2 roadmap (SPEC §18). This is the important part.

Build order is Phase 9 → 10 → 11 → 12. Governance: **Tier-A work merges direct to main;
Workday (Tier-B) enters via PR per company.**

### Phase 9 — Coverage (Tier A) + registry rebalance — **NEXT, plan ready**

**Goal:** add the new public ATSs that proved viable, tag every company `direct` vs
`agency`, make the README featured table direct-only, enable the (already-built-but-hidden)
employer-type web filter, and run a registry pass targeting **≥25 new direct employers** to
fix the 45-agency skew.

**The plan is fully written** in [docs/plans/phase-9-plan.md](docs/plans/phase-9-plan.md)
— 21 TDD tasks, real captured response shapes, exact code. **Execute it** task-by-task
with checkpoints.

**Research already done (drove the plan):**

| ATS | Verdict | Why |
| --- | --- | --- |
| **BambooHR** | ✅ IN | `{slug}.bamboohr.com/careers/list` → anonymous JSON. Unknown tenants 3xx-redirect (→ dead-slug). |
| **Breezy** | ✅ IN | `{slug}.breezy.hr/json` → anonymous JSON; cleanest (apply URL + date + salary in feed). |
| **Manatal** | ✅ IN | `careers-page.com/api/v1.0/c/{slug}/jobs/` → anonymous paginated JSON. Has a JD `description` we must **never read** (drop at normalize). |
| **Personio** | ⚠️ IN but **deferred** | Public but **XML** (pipeline only speaks JSON → new parser/dep) and EU-centric (~0 PH employers). |
| **Freshteam** | ❌ **OUT** | **No public unauthenticated feed** — `/jobs` is HTML-only, the API is 401, `.json` redirects to OAuth. Extracting = HTML scraping = out of scope (rule §2). |
| Teamtailor / Jobvite / Zoho Recruit | ❌ OUT | All require an API key / OAuth / vendor-issued feed link. |

**The big finding:** the SPEC originally named **Freshteam first** as the way to finally
add **Thinking Machines (PH)** and close that v1 graveyard entry. Freshteam **doesn't
qualify**. The plan therefore **cuts the Freshteam fetcher** and uses **Kumu via BambooHR**
(a PH company that was a dead-slug on all six v1 ATSs, now confirmed live with PH roles
incl. a "Marketing intern") as proof the new ATSs unlock the direct employers v1 couldn't
reach. **Thinking Machines stays unreachable** under our rules unless pursued via
partnership/PR.

**⚠️ FIVE OPEN QUESTIONS the maintainer must answer before/within execution** (full text in
the plan's "Open questions" section — resolve Q1 & Q3 before Tasks 5/15, Q2 & Q5 before
Task 17):

- **Q1 — Thinking Machines / Freshteam:** confirm cutting the Freshteam fetcher (Kumu
  replaces it as the graveyard-closer). TM stays unreachable.
- **Q2 — Personio:** build the XML fetcher now anyway, or park until a PH employer surfaces
  on it? (Plan defers.)
- **Q3 — Borderline direct/agency classifications:** confirm or flip each of SupportYourApp,
  Hello Rache, Xillium, Welo Global, Tech Firefly, Arcanys, Callbox. Each flip changes the
  45/56 split and what appears in the README featured table.
- **Q4 — Naming:** the listing field is `companyType` (registry keeps `type`) to avoid
  overloading the bare word `type`. OK, or mirror `industry` and use `type` everywhere?
- **Q5 — ≥25 target accounting:** Batch A slugs are guesses and many will miss. If new-ATS
  yield is thin, does counting Batch B (rechecks on existing ATSs) toward ≥25 satisfy the
  target, or must the ≥25 be net-new companies?

**Phase 9 mechanics worth knowing:** schema bumps **v2 → v3** (`companyType` denormalized
onto every listing, exactly like `industry` was in Phase 8); `recategorize` is the v2→v3
migration and a pre-migration `pnpm refresh` must fail loudly; the employer-type filter was
shipped dark in Phase 8 behind `EMPLOYER_TYPE_FILTER_ENABLED=false` and the URL param `type`
is reserved — Phase 9 just wires it and flips the flag.

### Phase 10 — Coverage, Workday tier (SPEC §17) — **Tier B, PR-per-company**

This is the phase that adds the credibility employers. **Highest legal sensitivity** — read
SPEC §17 in full before touching it.

- Build a Workday fetcher with **all §17.1 guardrails**: per-tenant **robots.txt gate**,
  **instant permanent stop on any block** (with a TRACKER flag), **≥2s** politeness,
  pagination cap, **jobs-list endpoint only — never job-detail pages** (that's where JD text
  lives), PH **location facets** for global tenants.
- **Prove the guardrails with tests** (blocked-response fixtures → permanent skip).
- **Wave 1, each via its own PR** with §17.2 evidence: **Globe** (`globe.wd3` / `GLB_Careers`),
  **GCash / Mynt** (same Globe tenant, site Mynt), **Accenture** (`accenture.wd103`, PH facet),
  **P&G** (`pg.wd5`, PH facet).
- **Wave 2** candidates from the PH-corporates graveyard in TRACKER (UnionBank, Cebu Pacific,
  PAL, San Miguel, URC, Security Bank, …) — tenant by tenant.

### Phase 11 — Web product features (client-side only) — **maintainer co-designs UX**

All localStorage, **no accounts, no backend, no third-party trackers**; core list stays
free and the apply-flow regression-free.

- **Application tracker:** a Track button next to Apply, status flow
  (saved → applied → interview → offer/rejected), a "My applications" view, JSON export.
- **Preferences:** persisted default filters, one-tap reset.
- **Support & feedback:** navbar button (GitHub issues + donate link) and a dismissible
  prompt shown **at most ~every 5 Apply clicks** with a permanent opt-out. The maintainer
  wants to co-design this UX in-phase (it's their idea — "a dialog middle of screen").
- **PWA baseline:** manifest + icons, installable. (Full native mobile app stays ROADMAP,
  only if the PWA proves demand.)

### Phase 12 — Reach & SEO — **maintainer-led** (agents prepare, maintainer publishes)

- RSS feed(s) from the pipeline; OG share images; sitemap; per-page metadata.
- "Copy link to this view" affordance (builds on the Phase 8 URL params).
- Google Search Console — **maintainer**. Distribution posts (r/phcareers, FB groups,
  university orgs) — **maintainer**. Newsletter bridge (e.g. Buttondown over RSS) —
  recommend, don't build.

### Beyond v2 (ROADMAP.md — not in scope, don't build unprompted)

Crowdsourced submissions (the Simplify flywheel, revisit once there's an audience), polite
HTML scraping of career pages (PR-gated, gray — explicit go/no-go per company), other
enterprise platforms (SuccessFactors/Taleo/Phenom/Eightfold/Avature — same §17-style eval),
partnership outreach (Kalibrr, JobStreet/SEEK — the truly clean path to board data), full
email alerts, Telegram/Viber digest, trends page, Taglish UI. **Explicit non-goals:**
scraping the prohibited boards, evading any block, hosting application flows / collecting
applicant data, or paywalling the core list — ever.

---

## 6. Key decisions & rationale (the ones that shape future work)

Full dated log is in [TRACKER.md](TRACKER.md) "Decision log". The load-bearing ones:

- **Sources:** public ATS APIs only for v1; Workday greenlit as Tier B for v2 under §17
  guardrails, PR-per-company. Job boards never.
- **PH definition:** PH-located + explicit "Remote - Philippines". Broad APAC-remote is
  excluded by design (this is why several "live but 0 PH" boards in the graveyard stay out).
- **Website-first, curated README.** The site is the product; the README shows a curated
  internships+entry slice (30-day window, cap 200 rows). v2 makes that table **direct-only**.
- **Stack:** TypeScript end-to-end, **pnpm only** (the pipeline script is `pnpm refresh`
  because `update`/`fetch` are pnpm built-ins — never name a script either). Strict mode,
  one shared `Listing` type, ISO-8601 UTC dates.
- **Listings are never deleted** — vanished ones get `active: false`. `datePosted` is
  immutable; stable sort (company asc, datePosted desc) for reviewable diffs.
- **Registry (`pipeline/companies.json`) is the crown jewel** and the only hand-edited data
  file. Entries need `verified: true` (endpoint confirmed live) before the pipeline uses them.
- **Data = facts only, link out always.** CC0 1.0 for the datasets, MIT for the code —
  rationale: claiming attribution rights over *facts* would contradict our own legal stance.
- **Categorizer is deliberately conservative** (SPEC §9 "never guess"): an unknown level is
  better than a wrong one. PH-vocabulary rules are mined from the *real* dataset, never
  invented (CSR/TSR/SDR → entry but only after senior/mid markers; supervisor/team-leader →
  senior; "Project Manager" stays `other` — no honest bucket; bare "officer" is NOT senior
  because PH "HR Officer" is staff-level; etc.).
- **Schema changes require updating SPEC §6 first, in the same commit.** Value-list changes
  (functions, metros) too.

---

## 7. Gotchas & hard-won lessons (read before you trip on them)

- **Daily bot conflict.** The `github-actions[bot]` commits `data/listings.json` + `README.md`
  + `data/fetch-state.json` every night at 22:00 UTC. **Always `git pull --rebase` before
  pushing.** On a generated-file conflict, resolve toward the **newer refresh**. (See the
  maintainer's memory note on this.)
- **PowerShell corrupts git commit messages.** Inline here-strings and `Out-File` both
  mangle the subject (UTF-8 BOM leaks in, quotes break native-arg parsing). Write the message
  to a BOM-free file and use `git commit -F`, or use the Bash tool with a heredoc.
- **A green refresh always commits** even if no listings changed, because every run rewrites
  `updatedAt` in both generated files. That's *intentional* — it keeps the dateline fresh,
  triggers the daily Vercel redeploy, and carries `fetch-state.json` (the 3-strikes dead-slug
  counter) across CI runs. Don't "optimize" the timestamp away.
- **PH-HQ + 0-postings = confirm identity.** Generic slugs caused real wrong-company
  additions in v1: `lever:maya` (a US firm, not the PH fintech), `greenhouse:thinkingmachines`
  (the US AI *Lab*, not the Manila data consultancy). `verify-registry` now prints a
  `CONFIRM-IDENTITY` warning for any PH-HQ verification with zero PH postings — heed it.
- **Empty ≠ dead, per-ATS.** SmartRecruiters returns `200` with empty results for *unknown*
  companies, so the SR fetcher treats empty as dead-slug (freezes listings instead of mass-
  deactivating). Workable returns `200 + jobs:[]` for live-but-quiet accounts = a *successful*
  empty fetch. BambooHR/Breezy 3xx-redirect unknown tenants (→ dead-slug); Manatal 404s them.
- **`level: unknown` is ~58%, structurally — do NOT "fix" it by guessing.** The Phase 8
  target was <25% and it wasn't met *on purpose*: the unknown mass is genuinely unleveled
  titles ("PHP Developer", "Bookkeeper", "Graphic Designer") with no marker at all, and SPEC
  §9 forbids leveling them. The recommendation on file is to revisit the *target* in the SPEC,
  not to trade accuracy for coverage. (`function: other` *did* hit its <15% target at 13.7%.)
- **Open taxonomy/metro backlogs** (mined but deliberately unmapped — no honest bucket):
  agriculture/farm roles (Pilmico), lab/science analysts (SGS), bare "Business Analyst"/
  "Project Manager", BPO quality-systems titles; and Tarlac/Central-Luzon locations fall to
  `other-ph`. Add buckets/tags only via a SPEC update in the same commit.
- **The candidate graveyard in TRACKER is valuable, not noise.** It records ~200 probed
  companies with the exact slugs/ATSs tried and the result (dead, live-but-0-PH, or later
  ➜✅). Phase 9's round-3 list mines it; don't re-probe blindly — check it first.

---

## 8. How to execute a phase (the maintainer's workflow)

The maintainer runs each phase as a **four-stage workflow, one prompt per message, in a
single chat**, in order:

1. **PLAN** — research + write `docs/plans/phase-N-plan.md`, **no implementation code**,
   commit the plan. (Uses superpowers:writing-plans. Phase 9's plan is already at this
   stage — its plan file exists.)
2. **IMPLEMENT** — follow the committed plan with superpowers:test-driven-development; don't
   push yet.
3. **REVIEW** — superpowers:verification-before-completion + the `/code-review` skill; paste
   real command output; fix small issues inline.
4. **FINALIZE** — update TRACKER (check off items, log decisions with dates, move graveyard
   entries), commit in sensible increments, `git pull --rebase`, push, confirm CI green.

**Governance per tier:** Phase 9 (Tier-A) finalizes **direct to main**. Phase 10 (Workday,
Tier-B) finalizes via **a PR per company** with SPEC §17.2 evidence (the adapter *code* can
merge to main; each company *entry* is its own PR).

When the maintainer asks for "the prompt for phase N," produce these four self-contained
stage prompts (each must work in a cold session because they're pasted into fresh chats).

### Standing working agreement (from CLAUDE.md)

- Keep docs/TRACKER.md current every session — it's the memory between sessions.
- TDD for pipeline logic (fixtures from real ATS responses, JD text stripped before commit).
- Building the website: use the frontend-design skill + vercel-react-best-practices;
  mobile-first. Use context7 for current library docs; use playwright to verify the site.
- Verify before claiming done: actually run `pnpm refresh` and `pnpm --filter web build`
  and look at the output.

---

## 9. Repo map & commands

**Map:** `pipeline/` (TS CLI — `companies.json` registry + `src/` fetchers/normalize/
filter/categorize/merge/readme/cli/verify-registry/backfill); `data/listings.json`
(generated source of truth, committed, never hand-edit); `web/` (Next.js static export
reading `data/listings.json` at build); `README.md` (generated — never hand-edit);
`docs/SPEC.md` (PRD), `docs/plans/` (phase plans); `docs/TRACKER.md`, `docs/ROADMAP.md`,
`CLAUDE.md`.

**Commands (pnpm only):**
```
pnpm install                       # workspace install (root)
pnpm refresh                       # full pipeline: fetch → data/listings.json → README.md
pnpm --filter web dev              # run the site locally
pnpm --filter web build            # static build (fails on invalid listings.json)
pnpm test                          # all tests
pnpm --filter pipeline eval-categorizer   # coverage % + top-50 uncategorized titles
pnpm --filter pipeline recategorize       # full-dataset backfill / schema migration
pnpm --filter pipeline verify-registry    # probe candidates.json → merge verified
```

---

## 10. Immediate next action for whoever reads this

1. Confirm the **Phase 9 open questions Q1–Q5** with the maintainer (§5) — at minimum Q1
   (cut Freshteam) and Q3 (borderline classifications) before any registry edit.
2. Then execute **Phase 9** from [docs/plans/phase-9-plan.md](docs/plans/phase-9-plan.md)
   via the Implement → Review → Finalize stages.
3. Independently, remind the maintainer of the two launch to-dos in §4 (make the repo
   public; set description/website/topics) — these are blocking real-world reach and are
   maintainer-only.
