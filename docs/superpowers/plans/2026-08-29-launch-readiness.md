# Launch Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the remaining promotion blockers, make refresh failures actionable, improve mobile accessibility and first-load weight, and prepare the public repository for launch.

**Architecture:** Keep the existing static Next.js site and sequential public-ATS pipeline. Treat a blocked Workday registry entry as disabled without probing it again, validate generated data before commit, and make small client-only UX improvements without adding accounts or a backend.

**Tech Stack:** pnpm 11, TypeScript strict mode, Node.js 22+, Vitest, Next.js 16 static export, React 19, Tailwind CSS 4, GitHub Actions, Vercel Analytics.

## Global Constraints

- Use pnpm only; never npm or yarn.
- Never fetch from job boards or aggregators.
- Fetch only documented public Tier-A ATS APIs, plus existing Workday entries under SPEC §17.
- Keep requests sequential with the existing identifying User-Agent and politeness delays.
- Never store job-description text or personal data.
- Never hand-edit `data/listings.json` or `README.md`; regenerate them through the pipeline.
- Update `docs/SPEC.md` before or with lifecycle/schema behavior changes.
- Update `docs/TRACKER.md` with decisions, resolved issues, remaining maintainer work, and verification.

---

### Task 1: Retire the blocked TELUS board safely

**Files:**
- Modify: `docs/SPEC.md`
- Modify: `pipeline/companies.json`
- Modify: `pipeline/src/cli.ts`
- Modify: `pipeline/src/merge.ts`
- Test: `pipeline/tests/merge.test.ts`

**Interfaces:**
- Consumes: registry `verified` state and the existing `data/fetch-state.json` block record.
- Produces: optional registry `disabled: true` provenance and `MergeInput.inactiveCompanies`, a set of company names whose active listings must become inactive without another request.

- [ ] **Step 1: Write a failing merge test**

Add a test proving that an active listing is deactivated when its company is explicitly present in `inactiveCompanies`, even though no fetch succeeded.

- [ ] **Step 2: Verify the test fails**

Run `pnpm --filter pipeline test -- merge.test.ts`; expect TypeScript or assertion failure because `inactiveCompanies` is not implemented.

- [ ] **Step 3: Implement terminal registry deactivation**

Extend `MergeInput` with `inactiveCompanies: Set<string>`. In `mergeListings`, deactivate old active listings when their company is in that set. Add optional `disabled: true` to the registry format, populate the set only for company names with no enabled board, preserve TELUS Digital's historical verification and block note, and document the lifecycle rule in SPEC §7 and §10.

- [ ] **Step 4: Verify and commit**

Run the focused pipeline tests, then commit as `fix(pipeline): retire blocked registry sources`.

### Task 2: Bound requests and give refresh enough time

**Files:**
- Modify: `pipeline/src/fetchers/http.ts`
- Modify: `pipeline/src/fetchers/workday.ts`
- Test: `pipeline/tests/fetchers.test.ts`
- Test: `pipeline/tests/workday.test.ts`
- Modify: `.github/workflows/refresh.yml`

**Interfaces:**
- Consumes: `HttpDeps` used by every fetcher.
- Produces: optional `timeoutMs`, defaulting to 30 seconds, applied through a fresh `AbortSignal.timeout()` per request.

- [ ] **Step 1: Add failing timeout tests**

Assert that Tier-A GET requests, Workday robots requests, and Workday jobs POST requests receive an abort signal.

- [ ] **Step 2: Implement request timeouts**

Add `timeoutMs?: number` to `HttpDeps`, default it to `30_000`, and attach a new abort signal to each request. Preserve Workday's no-retry block behavior.

- [ ] **Step 3: Harden the workflow**

Raise the job timeout from 30 to 60 minutes. After `pnpm refresh`, run format check, typecheck, web lint, tests, and web build before committing generated data.

- [ ] **Step 4: Verify and commit**

Run focused fetcher tests and YAML parsing, then commit pipeline and workflow changes separately.

### Task 3: Complete mobile accessibility and feedback paths

**Files:**
- Modify: `web/app/page.tsx`
- Modify: `web/components/job-board.tsx`
- Modify: `web/components/my-jobs.tsx`
- Create: `.github/ISSUE_TEMPLATE/report-listing.yml`
- Create: `.github/ISSUE_TEMPLATE/add-company.yml`
- Create: `.github/ISSUE_TEMPLATE/bug-report.yml`
- Create: `.github/ISSUE_TEMPLATE/config.yml`

**Interfaces:**
- Consumes: existing repository URL constants and local tracker callbacks.
- Produces: named mobile icon controls, a skip link, complete focus states, confirmed destructive removal, and public support entry points.

- [ ] **Step 1: Add accessible names and focus styles**

Add `aria-label` to the mobile Companies and My Jobs buttons, add a skip link targeting `#main-content`, and give every remaining link/button a visible focus-visible ring.

- [ ] **Step 2: Announce asynchronous copy feedback**

Place the copy-link status inside an `aria-live="polite"` region and surface clipboard failure as actionable text.

- [ ] **Step 3: Confirm destructive tracker removal**

Use a native confirmation dialog whose message names the saved role before invoking `onRemove`.

- [ ] **Step 4: Add support routes**

Link the footer to GitHub Issues and add structured issue forms for bad listings, company suggestions, and site bugs.

- [ ] **Step 5: Verify and commit**

Run web tests, lint, and typecheck, then commit accessibility and feedback as separate changes.

### Task 4: Improve launch measurement and freshness language

**Files:**
- Modify: `web/app/page.tsx`
- Modify: `web/components/job-board.tsx`
- Modify: `web/lib/site.ts`
- Modify: `web/lib/seo-config.test.ts`

**Interfaces:**
- Consumes: `track` from `@vercel/analytics` and existing non-sensitive job facets.
- Produces: `apply_click`, `job_saved`, `job_unsaved`, and `copy_filter_link` events without recording search text or personal data.

- [ ] **Step 1: Update source-faithful copy**

Replace “Fresh jobs” with “Jobs and internships … checked daily” and add a short note that dates are source-published when available and otherwise first-seen dates.

- [ ] **Step 2: Add privacy-minimal custom events**

Track apply, save/unsave, and copy-link actions using company, level, function, and work setup only. Never send search queries, locations typed by users, or tracker contents.

- [ ] **Step 3: Verify and commit**

Update copy tests if needed, run web tests/typecheck/lint, and commit.

### Task 5: Reduce oversized brand assets on the page

**Files:**
- Create: `web/public/social/simplifytrabaho-icon-192.png`
- Create: `web/public/social/simplifytrabaho-mark-192.png`
- Modify: `web/app/page.tsx`
- Modify: `web/README.md`

**Interfaces:**
- Consumes: selected 860px/1254px source PNGs.
- Produces: dedicated 192px display assets while preserving the original social/PWA files.

- [ ] **Step 1: Generate 192px derivatives**

Use macOS `sips` to resize each selected source into a separate 192×192 PNG. Verify pixel dimensions and byte size.

- [ ] **Step 2: Switch only header/footer display usage**

Use the new derivatives in page chrome. Leave Open Graph, square-social, and PWA sources untouched.

- [ ] **Step 3: Build and commit**

Run the web build, confirm asset paths exist in `web/out`, and commit.

### Task 6: Explore legal Tier-A company additions

**Files:**
- Modify only when verified: `pipeline/candidates.json`, `pipeline/companies.json`, `docs/TRACKER.md`

**Interfaces:**
- Consumes: official Greenhouse, Lever, Ashby, Workable, SmartRecruiters, Recruitee, BambooHR, Breezy, or Manatal public endpoints.
- Produces: registry entries only when identity and at least one current Philippine posting are confirmed by the existing verifier.

- [ ] **Step 1: Search official ATS-hosted pages**

Search supported ATS domains for Philippine locations. Exclude every job board/aggregator and do not probe guessed Workday tenants.

- [ ] **Step 2: Remove already-tracked companies**

Compare candidates against `pipeline/companies.json` by ATS, slug, and company identity.

- [ ] **Step 3: Verify candidates politely**

Add candidates to `pipeline/candidates.json` and run `pnpm --filter pipeline verify-registry`. Keep only entries the tool verifies live with Philippine roles and correct identity.

- [ ] **Step 4: Commit additions or the documented no-add result**

Commit verified registry additions. If none pass, record the explored official sources and reasons in TRACKER without inventing entries.

### Task 7: Regenerate, verify, publish the branch

**Files:**
- Generated: `data/listings.json`
- Generated: `README.md`
- Modify: `docs/TRACKER.md`

**Interfaces:**
- Consumes: all implementation tasks.
- Produces: a reviewable branch and pull request.

- [ ] **Step 1: Run one final refresh**

Run `pnpm refresh` once after registry changes so generated data and README reflect the branch. Do not hand-edit either file.

- [ ] **Step 2: Run local release gates**

Run `pnpm format:check`, `pnpm typecheck`, `pnpm --filter web lint`, `pnpm test`, and `pnpm --filter web build`.

- [ ] **Step 3: Update tracker and repository metadata**

Record the session and fix stale private-repository notes. Set the GitHub description, homepage, and topics with `gh repo edit`.

- [ ] **Step 4: Push and create the PR**

Push `codex/launch-readiness`, open a PR against `main` with verification and remaining maintainer steps, and stop without waiting for CI.
