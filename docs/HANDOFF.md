# HANDOFF — SimplifyTrabaho

> **What this is.** A snapshot written 2026-06-16 to hand the project off to a fresh
> Claude Code instance. **It is an archive, not the current state.** Everything it
> called "pending" (Phases 9 to 12) shipped on 2026-07-06. Sections 4, 5 and 10 have
> been collapsed to pointers; the rest is kept because it carries the _why_ behind the
> project that the other docs don't record.
>
> **If you are a new agent, do not start here.** Start with [CLAUDE.md](../CLAUDE.md)
> (non-negotiable rules), then [SPEC.md](SPEC.md) (the PRD), then
> [TRACKER.md](TRACKER.md), which is the live work log and the only accurate source for
> what is done and what is next. Read this file afterward, for background on the
> maintainer's intent and the decisions that shaped the codebase. Where anything here
> disagrees with those files, they win.

---

## 1. The vision — what this project is and wants to be

SimplifyTrabaho is **a free, open, auto-updated list of jobs at Philippine companies** —
all roles, all levels, with internships & entry-level featured by default. It's the PH
counterpart of [SimplifyJobs/Summer2026-Internships](https://github.com/SimplifyJobs/Summer2026-Internships),
which the maintainer chose deliberately as the blueprint because (1) it already works and
(2) it's legally clean. We copy their _architecture and legal posture_, not their code,
and adapt it to the PH market.

**The maintainer's framing, in their own words (from the planning "hub chat"):**

- "main inspo is the simplify jobs repo … make it PH focused."
- Scope grew from internships-only to **all jobs, all levels, all industries** (not just
  tech) — "You are fable 5, you can do a lot of things." Internships + fresh-grad/entry
  stay _featured_ because entry-level hunting is the bigger PH pain point.
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
judgment calls, optimize for: _more recognizable direct employers, better categorization
that matches what users expect, and features/reach that get this in front of PH job
seekers_ — while never bending the legal rules.

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
  agent should be comfortable both _executing_ a stage and _producing_ the next-stage
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
_every_ future phase, especially Workday (Phase 10):

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

## 4 and 5. Where things stood in June 2026 (superseded)

These two sections described the state of the project on 2026-06-16 and laid out the v2
roadmap as pending work. Both are now history:

- Phases 9 through 12 all shipped on 2026-07-06. That covers the Tier-A ATS expansion
  (BambooHR, Breezy, Manatal), the direct/agency split, the Workday tier with its
  robots.txt guardrails, the client-side application tracker and preferences, and the
  RSS/OG/sitemap reach work.
- The Phase 9 plan file this section told you to execute has been deleted.
- The v1 launch to-dos are done: the repo is public and the site URL is set on it. Only
  the GitHub topics remain unset, which is cosmetic.

For current status, open [TRACKER.md](TRACKER.md). Its phase sections and decision log
are maintained every session; this file is not.

### The ATS research that drove Phase 9 (still accurate, still useful)

This table is the reason the supported-system list looks the way it does. The verdicts
have not changed, so it is worth keeping in front of anyone evaluating a new platform:

| ATS                               | Verdict  | Why                                                                                                                                                                         |
| --------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BambooHR                          | IN       | `{slug}.bamboohr.com/careers/list` returns anonymous JSON. Unknown tenants 3xx-redirect, which the fetcher treats as a dead slug.                                           |
| Breezy                            | IN       | `{slug}.breezy.hr/json` returns anonymous JSON, and it is the cleanest of the set (apply URL, date and salary all in the feed).                                             |
| Manatal                           | IN       | `careers-page.com/api/v1.0/c/{slug}/jobs/` returns anonymous paginated JSON. It includes a job description field that must be dropped at normalization and never stored.    |
| Personio                          | Deferred | Public, but XML rather than JSON, and EU-centric with almost no PH employers. Not worth a new parser until one shows up.                                                    |
| Freshteam                         | OUT      | No public unauthenticated feed. `/jobs` is HTML only, the API returns 401, and `.json` redirects to OAuth. Getting the data would mean scraping HTML, which rule 2 forbids. |
| Teamtailor, Jobvite, Zoho Recruit | OUT      | All require an API key, OAuth, or a vendor-issued feed link.                                                                                                                |

The consequence worth remembering: the SPEC originally named Freshteam as the route to
adding Thinking Machines, and Freshteam does not qualify. Thinking Machines stays
unreachable under our rules unless it is pursued through a partnership. Kumu, reached
via BambooHR, became the proof case instead.

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
  rationale: claiming attribution rights over _facts_ would contradict our own legal stance.
- **Categorizer is deliberately conservative** (SPEC §9 "never guess"): an unknown level is
  better than a wrong one. PH-vocabulary rules are mined from the _real_ dataset, never
  invented (CSR/TSR/SDR → entry but only after senior/mid markers; supervisor/team-leader →
  senior; "Project Manager" stays `other` — no honest bucket; bare "officer" is NOT senior
  because PH "HR Officer" is staff-level; etc.).
- **Schema changes require updating SPEC §6 first, in the same commit.** Value-list changes
  (functions, metros) too.

---

## 7. Gotchas & hard-won lessons (read before you trip on them)

- **Daily bot conflict.** The `github-actions[bot]` commits `data/listings.json` + `README.md`
  - `data/fetch-state.json` every night at 22:00 UTC. **Always `git pull --rebase` before
    pushing.** On a generated-file conflict, resolve toward the **newer refresh**. (See the
    maintainer's memory note on this.)
- **PowerShell corrupts git commit messages.** Inline here-strings and `Out-File` both
  mangle the subject (UTF-8 BOM leaks in, quotes break native-arg parsing). Write the message
  to a BOM-free file and use `git commit -F`, or use the Bash tool with a heredoc.
- **A green refresh always commits** even if no listings changed, because every run rewrites
  `updatedAt` in both generated files. That's _intentional_ — it keeps the dateline fresh,
  triggers the daily Vercel redeploy, and carries `fetch-state.json` (the 3-strikes dead-slug
  counter) across CI runs. Don't "optimize" the timestamp away.
- **PH-HQ + 0-postings = confirm identity.** Generic slugs caused real wrong-company
  additions in v1: `lever:maya` (a US firm, not the PH fintech), `greenhouse:thinkingmachines`
  (the US AI _Lab_, not the Manila data consultancy). `verify-registry` now prints a
  `CONFIRM-IDENTITY` warning for any PH-HQ verification with zero PH postings — heed it.
- **Empty ≠ dead, per-ATS.** SmartRecruiters returns `200` with empty results for _unknown_
  companies, so the SR fetcher treats empty as dead-slug (freezes listings instead of mass-
  deactivating). Workable returns `200 + jobs:[]` for live-but-quiet accounts = a _successful_
  empty fetch. BambooHR/Breezy 3xx-redirect unknown tenants (→ dead-slug); Manatal 404s them.
- **`level: unknown` is ~58%, structurally — do NOT "fix" it by guessing.** The Phase 8
  target was <25% and it wasn't met _on purpose_: the unknown mass is genuinely unleveled
  titles ("PHP Developer", "Bookkeeper", "Graphic Designer") with no marker at all, and SPEC
  §9 forbids leveling them. The recommendation on file is to revisit the _target_ in the SPEC,
  not to trade accuracy for coverage. (`function: other` _did_ hit its <15% target at 13.7%.)
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
Tier-B) finalizes via **a PR per company** with SPEC §17.2 evidence (the adapter _code_ can
merge to main; each company _entry_ is its own PR).

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
`docs/` holds SPEC.md (PRD), TRACKER.md (live work log), ROADMAP.md (future scope),
PIPELINE.md (the public explainer of how listings are sourced) and this file;
`CLAUDE.md` and `AGENTS.md` sit at the root.

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

## 10. What to do after reading this

Nothing in this file is a task list any more. For current work, read
[TRACKER.md](TRACKER.md): the phase sections say what shipped and when, the issues
section carries known problems such as dead slugs and misclassified titles, and the
decision log explains why things are the way they are.

One standing maintainer item survives from the original list: the repo's GitHub topics
are still unset (`philippines`, `jobs`, `internships`, `entry-level`, `fresh-graduates`,
`job-search`, `careers`, `job-listings`, `open-data`, `typescript`, `nextjs`). The repo
itself is public and the site URL is set.
