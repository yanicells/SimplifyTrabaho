# Phase 9 — Coverage (Tier A) + Registry Rebalance — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the candidate Tier-A ATSs that proved to have a truly public, unauthenticated jobs feed (BambooHR, Breezy, Manatal), tag every registry company `direct` vs `agency`, make the README featured table direct-only, enable the web employer-type filter, and run a round-3 registry pass targeting ≥25 new **direct** employers.

**Architecture:** Each new ATS is one fetcher module + one normalizer (same shape as the six existing ones), reusing the polite HTTP layer. The company `type` is a registry fact denormalized onto every `Listing` at normalization (exactly like `industry` in Phase 8), so the README generator and the web both read it from the listing with no second data source. Schema bumps v2 → v3; `recategorize` is the v2→v3 migration path. The employer-type web filter was already built (dark) in Phase 8 — Phase 9 only wires it to data and flips the flag.

**Tech Stack:** TypeScript (strict, NodeNext ESM), vitest, tsx; Next.js (App Router, static export) + Tailwind on the web side. pnpm only.

---

## 0. Research findings (this drove the plan — read before implementing)

All probes below were live `GET`s on 2026-06-13, ≥1s apart, with the honest
User-Agent `simplifytrabaho/0.1.0 (+https://github.com/yanicells/SimplifyTrabaho)`,
read-only. No auth was attempted or bypassed.

### 0.1 Candidate ATS probe matrix (SPEC §5.1)

A candidate qualifies **only** if it serves a truly public, unauthenticated jobs feed.
"Needs an API key / OAuth / a feed link issued by the vendor" → **OUT** (that is the
company's private API, not a published board). "HTML-only, no structured public feed"
→ **OUT** (HTML scraping is out of scope per SPEC §4).

| ATS | Probed endpoint | Auth? | Format | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- |
| **Freshteam** | `https://thinkingmachines.freshteam.com/jobs` (HTML); `/api/job_postings`; `/job_postings.json` | **Yes** — `/api/job_postings` → `401 invalid_credentials`; `.json` paths → `302` to OAuth login | HTML only | **OUT** | `/jobs` is server-rendered HTML (jobs in `class="job-title"` markup), **no** JSON-LD, **no** inline JSON blob, **no** public JSON feed. The only machine path is auth-gated. Extracting jobs = HTML scraping = SPEC §4 out-of-scope. |
| **BambooHR** | `https://{slug}.bamboohr.com/careers/list` | **No** (anonymous 200) | JSON | **IN** | `muckrack.bamboohr.com/careers/list` → `200 {"meta":{"totalCount":N},"result":[…]}`. `kumu.bamboohr.com/careers/list` → 8 PH jobs. Unknown/inactive tenants `302` (not an auth challenge). |
| **Breezy** | `https://{slug}.breezy.hr/json` | **No** (anonymous 200) | JSON | **IN** | `breezy.breezy.hr/json` → `200 [ { name, url, published_date, type, location{country,city,is_remote}, salary } ]`. Unknown tenants `302`→breezy.hr. |
| **Manatal** | `https://www.careers-page.com/api/v1.0/c/{slug}/jobs/?page_size=&page=` | **No** (anonymous 200) | JSON (paginated) | **IN** | `…/c/manatal/jobs/` → `200 {count, next, previous, results:[…]}`. Endpoint is the one the public Vue career page itself calls (`apiBaseURL = ${baseUrl}/api/v1.0/c/${clientSlug}/`). Unknown slug → `404 {"detail":"No ClientPortalSettings matches…"}`. |
| **Personio** | `https://{slug}.jobs.personio.de/xml?language=en` (some accounts `.com`) | **No** (anonymous 200) | **XML** | **IN, but DEFER — see §2.3** | `personio.jobs.personio.de/xml` → `200` XML `<workzag-jobs><position>{ id, name, office, department, employmentType, seniority, schedule, createdAt, jobDescriptions } …`. Public but **XML** (pipeline only speaks JSON today) and Personio is EU-centric (≈0 PH employers). |
| **Teamtailor** | `api.teamtailor.com` | **Yes** — `Authorization: Token …` + `X-Api-Version` required, even the "Public" key must be minted inside an account | JSON | **OUT** | Per Teamtailor API docs; no anonymous feed. |
| **Jobvite** | XML/JSON requisition feed | **Yes** — feed link / API key+secret issued by Jobvite Customer Success on request | XML/JSON | **OUT** | Per Jobvite career-site docs; not anonymous. |
| **Zoho Recruit** | Recruit API / careers widget | **Yes** — OAuth 2.0 access token required | JSON | **OUT** | Per Zoho Recruit developer guide; careers widget data is auth-gated. |

**Headline result:** Freshteam — the SPEC's named "first Phase 9 target, closes the
Thinking Machines graveyard entry" — **does not qualify** (no public feed; auth-gated +
HTML-only). But the probe of the new ATSs turned up a **direct replacement**:
**Kumu** (a PH consumer/social company that was a dead-slug graveyard entry on all six
v1 ATSs) is live on **BambooHR** (`kumu.bamboohr.com`, 8 PH roles incl. a "Marketing
intern"). BambooHR/Breezy/Manatal are exactly the new reach v1 lacked, and they unlock
PH **direct** employers. This is flagged as **Open Question Q1** (Thinking Machines stays
unreachable; Freshteam fetcher is cut from the plan).

### 0.2 Captured response shapes (for the normalizers + fixtures)

**BambooHR** `result[]` item (real, from `kumu.bamboohr.com/careers/list`):
```jsonc
{
  "id": "319",
  "jobOpeningName": "Marketing intern",            // → title
  "departmentId": "20082",
  "departmentLabel": "Content and Marketing",        // function hint only (not stored)
  "employmentStatusLabel": "Intern",                 // Intern|Contractor|Probationary|Full-Time → employmentType
  "location": { "city": "Makati", "state": "Metro Manila" },
  "atsLocation": { "country": "Philippines", "state": null, "province": "NCR", "city": "Makati" },
  "isRemote": null,                                  // true → remote
  "locationType": "2"
}
```
- No date field in the list feed → `publishedAt: null` (datePosted falls back to first-seen, SPEC §6 — same as Workable/SmartRecruiters when absent).
- Apply URL is **constructed**: `https://{slug}.bamboohr.com/careers/{id}` (verified `200` HTML).
- `200 { result: [] }` = live board with zero jobs → **successful empty fetch** (keep PH-HQ companies). Unknown tenant → `302` → dead-slug.

**Breezy** array item (real, from `breezy.breezy.hr/json`):
```jsonc
{
  "id": "98323abf2296",
  "name": "Employee #12",                            // → title
  "url": "https://breezy.breezy.hr/p/…",             // → apply URL (provided)
  "published_date": "2024-02-15T14:37:22.684Z",      // → datePosted
  "type": { "id": "other", "name": "Other" },        // → employmentType
  "location": { "country": { "name": "United States", "id": "US" }, "city": "Chaos", "is_remote": false, "name": "Chaos, FL" },
  "department": "Does Not Matter",
  "salary": "$0.05 - $0.06 / hr"                       // → salary (verbatim string when present)
}
```
- No JD text in the list feed (good). Apply URL provided. `200 []` = live empty.

**Manatal** `results[]` item (real, from `…/c/manatal/jobs/`):
```jsonc
{
  "id": 2883259,
  "hash": "L9Y69V66",                                // → apply URL hash
  "position_name": "AI Content Marketing Internship", // → title
  "organization_name": "Marketing",
  "description": "<p>…HTML…</p>",                      // JD TEXT — NEVER read/store (drop at normalize)
  "country": "Thailand", "state": "Bangkok", "city": "Bangkok", "address": "…", "zipcode": "…",
  "location_display": "…",
  "is_salary_visible": false
}
```
- No date field → `publishedAt: null` (first-seen fallback).
- Apply URL **constructed**: `https://www.careers-page.com/{slug}/job/{hash}` (from the page's own `clientSlug}/job/${job.hash}`).
- Paginated: `{ count, next, previous, results }` — fetch every page (cap pages like SmartRecruiters). Unknown slug → `404` → dead-slug. `200 { results: [] }` = live empty.

**Personio** `<position>` (real, from `personio.jobs.personio.de/xml`) — for the deferred fetcher only: `id`, `name`, `office` + `additionalOffices/office`, `department`, `employmentType` (permanent/intern…), `seniority` (experienced/entry/student…), `schedule` (full-time/part-time), `createdAt` (ISO), `jobDescriptions/jobDescription` (**JD text — drop**). No URL element (construct `https://{slug}.jobs.personio.de/job/{id}`).

### 0.3 Registry classification — all 101 companies (direct vs agency)

Rule (SPEC §7): `agency` = staffing / outsourcing / recruitment firms hiring on behalf
of clients; `direct` = everyone else. Classifying by the existing `industry` tag
(`staffing`, `outsourcing`, `recruitment` → agency) reproduces **exactly the 45-agency
skew** the v2 decision log records (45 agency / 56 direct). Full proposed mapping:

**AGENCY (45):**

- _staffing (18):_ 1840 & Company, Assist World, Cloud Accountant Staffing, CrewBloom, Cyberbacker, G2i, Hire Hangar, Hire Overseas, Hireframe, HireHawk, Human Intelligence, Hunt St, PenBrothers, QuickTeam, Remote Philippines, Treantly, Virtual Staff 365, Wing Assistant
- _outsourcing (25):_ BSA Solutions, Callbox, Cloudstaff, Eastvantage, Emapta, Global Strategic, Infinit-O, iScale Solutions, ISTA Personnel Solutions, iSupport Worldwide, KMC Solutions, NeoWork, Outsource Access, Outsourced, ResultsCX, Smartsourcing, Sourcefit, Staff4Me, STAFFVIRTUAL, Telework PH, Trident BPO, Twoconnect, WNS Global Services, Yempo, ZigZag Careers
- _recruitment (2):_ Lennor Metier, Manila Recruitment

**DIRECT (56):**

3Cloud, AJAIA, Angkas, Apollo.io, Aprio, Arcanys, Arch Global Services PH, Ashby,
Auctane, Autohub Group, Azeus Systems, Bosch, CI&T, Clipboard Health, Coins.ph,
Delivery Hero, Delta Capita, Dialpad, Double the Donation, DoubleVerify, Etaily,
First Circle, Fresh Prints, FunGuy Studio, Gamigo PH, Gardenia Bakeries PH, GoTyme Bank,
Hello Rache, HelloFresh, Hopper, Hostaway, Instructure, Kasa, Lalamove,
Lightspeed Commerce, Mind You, NICE, Ninja Van, Oscilar, Palmetto, Pilmico, Remote,
Rocket Partners, Rundoo, SGS, Sprout Solutions, SupportYourApp, SwissTank Media,
TaxValet, Tech Firefly, TotalEnergies PH, Traba, Welo Global, Workstream, Xendit, Xillium

**Borderline — maintainer please eyeball** (industry tag and business model disagree;
my proposal in parens, but the call is yours per SPEC §7 "when in doubt, check what the
company sells"):

- **SupportYourApp** (tagged `customer-support` → proposed **direct**) — actually an
  outsourced-CX BPO hiring agents for clients → arguably **agency**.
- **Hello Rache** (tagged `healthtech` → **direct**) — supplies healthcare virtual
  assistants to US clinics → arguably **agency**.
- **Xillium** (tagged `healthtech` → **direct**) — healthcare BPO → arguably **agency**.
- **Welo Global** (tagged `ai-data` → **direct**) — localization services staffed for
  client projects → borderline.
- **Tech Firefly** (tagged `it-services` → **direct**) — tech-talent/recruitment leaning
  → borderline.
- **Arcanys** (tagged `it-services` → **direct**) — offshore dev teams for clients →
  borderline.
- **Callbox** (tagged `outsourcing` → **agency**) — lead-gen *service* provider; staff
  are its own → borderline the other way.

(SwissTank Media is a media/marketing studio, **not** a staffing agency → stays
**direct**; "agency" in SPEC §7 means staffing/outsourcing/recruitment only.)

### 0.4 Round-3 candidate list — ≥25 new DIRECT employers

Two batches. **Batch A** = PH direct employers that were graveyard dead-slugs on the six
v1 ATSs, re-probed on the **new** ATSs (slugs are lowercased-name guesses to be confirmed
by `verify-registry`). **Batch B** = direct employers already on a supported v1 ATS that
showed 0 PH roles before — cheap rechecks, no new fetcher needed. Kumu is **confirmed
live** (add directly). This is the seed for `candidates.json`; verification happens in
Task 17, not now.

Batch A (PH direct, probe on BambooHR/Breezy/Manatal): **Kumu (confirmed)**, PayMongo,
Maya, PDAX, NextPay, Tonik, BillEase, Coda Payments, SafetyCulture, Peddlr, UNAWA, mWell,
Salarium, GrowSari, Packworks, Expedock, Locad, Edamama, Zennya, CloudEats, SariSuki,
Symph, Eskwelabs, Voyager Innovations, Advance.ph. **(25 names.)**

Batch B (direct rechecks on existing ATSs): Deel (ashby), Kraken (ashby), Supabase
(ashby), Kittl (ashby), Pareto.AI (ashby), Flagright (ashby), Zip (ashby), Payabli
(ashby), OnePay (ashby), OKX (greenhouse), Reddit (greenhouse), dbt Labs (greenhouse),
Helium 10 (greenhouse), InfoTrust (greenhouse), Betr (lever), Luxury Presence (lever),
InDebted (lever), Time Doctor (recruitee).

Acceptance for the phase: **≥25 new direct employers verified, OR documented evidence the
well is dry** (TRACKER), with the agency/direct mix reported.

---

## Key decisions (resolve these before coding; flagged questions in §"Open questions")

1. **`type` is denormalized onto every `Listing` (chosen) vs. registry lookup at gen time
   (rejected).** The README generator (`readme.ts`) and the web data layer
   (`web/lib/listings.ts`) both learn a listing's company type by reading a `companyType`
   field on the `Listing`/`Job` — **not** by joining to `companies.json` at generation
   time.
   - _Why:_ (a) Exact precedent — Phase 8 denormalized `industry` from the registry onto
     each listing in `normalize.ts`; `type` is the same kind of company-level fact.
     (b) Keeps the web's single-source contract (it reads only `data/listings.json`; no
     second file, no fragile name-join). (c) The merge layer already content-compares
     `industry`; adding `companyType` to `COMPARED_FIELDS` makes a reclassification
     propagate on the next refresh. (d) Cost is a schema bump v2→v3 + a `recategorize`
     migration + web-validation update — all patterns Phase 8 already established.
   - _Rejected alternative (registry lookup):_ `cli.ts` could pass a `direct` name-set to
     `generateReadme`, and `listings.ts` could also read `companies.json` at build. This
     splits the source of truth at generation time, breaks the web single-file contract,
     and reintroduces a name-join that drifts when a display name changes.
2. **Schema bumps to v3.** `Listing` and `FetchedPosting` gain `companyType: "direct" |
   "agency"`; `ListingsFile.version` becomes `3`. `recategorize` is the designated v2→v3
   migration (it stamps `companyType` from the registry by company name, like it already
   stamps `industry`). A pre-migration `pnpm refresh` must fail loudly (v2 rejected),
   consistent with the Phase 8 decision log.
3. **Build BambooHR + Breezy + Manatal fetchers now; defer Personio.** All four are
   genuinely public, but Personio is XML (the pipeline only speaks JSON, so it needs a new
   parser + dependency) and EU-centric (≈0 PH employers). Building XML plumbing for ~zero
   yield is poor value. Personio is documented IN and parked as a fast-follow if a PH
   employer ever surfaces on it (Open Question Q2).
4. **`agency` definition stays narrow.** Staffing/outsourcing/recruitment only — not
   ad/marketing/media/dev-shop agencies. Borderline cases (§0.3) get the maintainer's call
   during the registry edit (Task 5).

---

## File structure

**Create:**
- `pipeline/src/fetchers/bamboohr.ts` — BambooHR fetcher (redirect→dead-slug).
- `pipeline/src/fetchers/breezy.ts` — Breezy fetcher (redirect→dead-slug).
- `pipeline/src/fetchers/manatal.ts` — Manatal fetcher (paginated).
- `pipeline/tests/fixtures/bamboohr-kumu.json` — real Kumu sample (JD-free already).
- `pipeline/tests/fixtures/breezy-sample.json` — real Breezy sample.
- `pipeline/tests/fixtures/manatal-manatal.json` — real Manatal sample, `description` stripped.

**Modify:**
- `pipeline/src/types.ts` — `ATS_SOURCES` += 3; `RegistryCompany.type`; `Listing.companyType`; `FetchedPosting.companyType`; `ListingsFile.version: 3`.
- `pipeline/src/fetchers/http.ts` — optional `redirectIsNotFound` (BambooHR/Breezy redirect unknown tenants instead of 404ing).
- `pipeline/src/normalize.ts` — all 6 existing normalizers add `companyType: company.type`; add `normalizeBambooHr`, `normalizeBreezy`, `normalizeManatal`.
- `pipeline/src/merge.ts` — `buildListing` sets `companyType`; `COMPARED_FIELDS` += `"companyType"`.
- `pipeline/src/files.ts` — `parseRegistry` validates `type`; `parseListingsFile` requires `version: 3`; `emptyListingsFile` → v3.
- `pipeline/src/backfill.ts` — accept v2/v3, output v3, stamp `companyType` from registry.
- `pipeline/src/cli.ts` + `pipeline/src/verify-registry.ts` — register the 3 new fetchers; write v3; verify-registry stamps `type`.
- `pipeline/src/readme.ts` — featured filter `companyType === "direct"`; ATS list copy += BambooHR/Breezy/Manatal.
- `pipeline/companies.json` — add `type` to all 101 entries (data edit, §0.3).
- `pipeline/candidates.json` — replace with the round-3 list (§0.4).
- `pipeline/tests/{fetchers,normalize,files,merge,backfill,readme}.test.ts` — new tests.
- `web/lib/listings.ts` — `Job.companyType`; `parseListing` validates `companyType`; `SOURCES` += 3; `toJobs` copies it.
- `web/lib/filter-params.ts` — `Filters.type`; codec for `type` param.
- `web/components/job-board.tsx` — `EMPLOYER_TYPE_FILTER_ENABLED = true`; wire the select to `filters.type`; predicate + `advancedCount`.
- `web/lib/{listings,filter-params}.test.ts` — new tests.
- `docs/SPEC.md` — §6 (Listing `companyType` + version 3), §5.1 (new ATS rows + probe verdicts), §7 note. **Same commit as the schema change** (CLAUDE.md rule).
- `TRACKER.md` — Phase 9 progress, graveyard updates (Kumu ➜✅, Freshteam OUT), decisions, agency/direct mix.

---

## Tasks

> TDD throughout (superpowers:test-driven-development). Commit after each green task.
> Fixtures come from the real responses captured in §0.2 — never hand-invent payloads.

### Task 1: Schema v3 types — `companyType` on registry, posting, and listing

**Files:**
- Modify: `pipeline/src/types.ts`
- Test: `pipeline/tests/files.test.ts`

- [ ] **Step 1: Add the new ATS ids and the `companyType` types**

In `pipeline/src/types.ts`, extend `ATS_SOURCES` and add the company-type union:

```typescript
export const ATS_SOURCES = [
  "greenhouse",
  "lever",
  "ashby",
  "workable",
  "smartrecruiters",
  "recruitee",
  "bamboohr",
  "breezy",
  "manatal",
] as const;
export type AtsSource = (typeof ATS_SOURCES)[number];

/** Schema v2 → v3 (SPEC §7): registry employer type, denormalized onto each Listing. */
export type CompanyType = "direct" | "agency";
```

- [ ] **Step 2: Add `type` to `RegistryCompany`, `companyType` to `FetchedPosting` and `Listing`, bump `ListingsFile.version`**

```typescript
export interface RegistryCompany {
  name: string;
  ats: AtsSource;
  slug: string;
  industry: string;
  /** Schema v3 (SPEC §7): "agency" = staffing/outsourcing/recruitment; else "direct". */
  type: CompanyType;
  verified: boolean;
  added: string;
  notes?: string;
}
```

Add to `Listing` (right after `industry`):

```typescript
  /** Schema v3: registry employer type copied at normalization (SPEC §7/§11). */
  companyType: CompanyType;
```

Add to `FetchedPosting` (right after `industry`):

```typescript
  /** Schema v3: the registry entry's employer type, copied at normalization. */
  companyType: CompanyType;
```

Change `ListingsFile`:

```typescript
export interface ListingsFile {
  version: 3;
  updatedAt: string;
  listings: Listing[];
}
```

- [ ] **Step 3: Run typecheck to see the expected breakage**

Run: `pnpm --filter pipeline typecheck`
Expected: FAIL — every normalizer (missing `companyType`), `buildListing`, `files.ts`, `cli.ts` now don't satisfy the types. This is the to-do list; the next tasks fix each.

- [ ] **Step 4: Commit**

```bash
git add pipeline/src/types.ts
git commit -m "feat(pipeline): schema v3 types — companyType + bamboohr/breezy/manatal sources"
```

---

### Task 2: `parseRegistry` validates `type`; `parseListingsFile`/`emptyListingsFile` require v3

**Files:**
- Modify: `pipeline/src/files.ts`
- Test: `pipeline/tests/files.test.ts`

- [ ] **Step 1: Write failing tests**

In `pipeline/tests/files.test.ts`, update `validCompany` to include `type: "direct"` and add:

```typescript
it("rejects an invalid employer type", () => {
  expect(() =>
    parseRegistry({ version: 1, companies: [{ ...validCompany, type: "vendor" }] }),
  ).toThrow(/type/i);
});

it("rejects a registry entry missing type", () => {
  const { type, ...noType } = validCompany;
  void type;
  expect(() => parseRegistry({ version: 1, companies: [noType] })).toThrow(/type/i);
});
```

Update the existing `parseListingsFile` version tests so v3 is accepted and v2 rejected:

```typescript
it("accepts a valid v3 file and the empty default", () => {
  const file = parseListingsFile(emptyListingsFile("2026-06-11T22:00:00.000Z"));
  expect(file.version).toBe(3);
});

it("rejects unsupported versions, including pre-migration v2", () => {
  expect(() => parseListingsFile({ version: 2, updatedAt: "x", listings: [] })).toThrow(/version/i);
  expect(() => parseListingsFile({ version: 4, updatedAt: "x", listings: [] })).toThrow(/version/i);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter pipeline test files`
Expected: FAIL — `type` not validated; `parseListingsFile` still expects 2.

- [ ] **Step 3: Implement**

In `parseRegistry`, after the `verified` check add:

```typescript
    if (entry.type !== "direct" && entry.type !== "agency") {
      fail(`${where} (${String(entry.name)}): type must be "direct" or "agency"`);
    }
```

and include it in the built object:

```typescript
    const company: RegistryCompany = {
      name: entry.name,
      ats: entry.ats as RegistryCompany["ats"],
      slug: entry.slug,
      industry: typeof entry.industry === "string" ? entry.industry : "",
      type: entry.type as RegistryCompany["type"],
      verified: entry.verified,
      added: typeof entry.added === "string" ? entry.added : "",
    };
```

Change `emptyListingsFile` and `parseListingsFile` to v3:

```typescript
export function emptyListingsFile(updatedAt: string): ListingsFile {
  return { version: 3, updatedAt, listings: [] };
}

export function parseListingsFile(raw: unknown): ListingsFile {
  const obj = raw as { version?: unknown; updatedAt?: unknown; listings?: unknown };
  // v2 files must go through `pnpm --filter pipeline recategorize` (the migration path).
  if (obj?.version !== 3) fail("listings file: unsupported version (expected 3)");
  if (typeof obj.updatedAt !== "string") fail("listings file: missing updatedAt");
  if (!Array.isArray(obj.listings)) fail("listings file: listings must be an array");
  return { version: 3, updatedAt: obj.updatedAt, listings: obj.listings as Listing[] };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter pipeline test files`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add pipeline/src/files.ts pipeline/tests/files.test.ts
git commit -m "feat(pipeline): validate registry type, require listings v3"
```

---

### Task 3: All six existing normalizers copy `companyType`

**Files:**
- Modify: `pipeline/src/normalize.ts`
- Test: `pipeline/tests/normalize.test.ts`

- [ ] **Step 1: Write a failing test**

Add to `pipeline/tests/normalize.test.ts` (use whatever fixture/company the file already imports for Greenhouse; here `company` must carry `type`):

```typescript
it("copies the registry companyType onto every posting", () => {
  const agencyCo = { ...greenhouseCompany, type: "agency" as const };
  const postings = normalizeGreenhouse(agencyCo, greenhouseFixture);
  expect(postings.every((p) => p.companyType === "agency")).toBe(true);
});
```

(If the existing test companies are inline literals, add `type: "direct"` to them so the file typechecks.)

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter pipeline test normalize`
Expected: FAIL — `companyType` missing on returned postings (and/or type error).

- [ ] **Step 3: Implement**

In **each** of the six existing normalizers (`normalizeGreenhouse`, `normalizeLever`, `normalizeAshby`, `normalizeWorkable`, `normalizeSmartRecruiters`, `normalizeRecruitee`), add one line beside the existing `industry: company.industry,` in the returned object:

```typescript
      industry: company.industry,
      companyType: company.type,
```

- [ ] **Step 4: Run to verify pass**

Run: `pnpm --filter pipeline test normalize`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add pipeline/src/normalize.ts pipeline/tests/normalize.test.ts
git commit -m "feat(pipeline): copy companyType through the six existing normalizers"
```

---

### Task 4: `buildListing` + merge carry `companyType`

**Files:**
- Modify: `pipeline/src/merge.ts`
- Test: `pipeline/tests/merge.test.ts`

- [ ] **Step 1: Write failing tests**

In `pipeline/tests/merge.test.ts`, ensure the helper that builds a `FetchedPosting`/`Listing` includes `companyType`, and add:

```typescript
it("carries companyType from posting onto the listing", () => {
  const posting = { ...basePosting, companyType: "agency" as const };
  expect(buildListing(posting, NOW).companyType).toBe("agency");
});

it("bumps dateUpdated when companyType changes", () => {
  const old = buildListing({ ...basePosting, companyType: "agency" }, OLD);
  const current = buildListing({ ...basePosting, companyType: "direct" }, NOW);
  const { listings } = mergeListings({
    existing: [old],
    current: [current],
    fetchedCompanies: new Set([old.company]),
    now: NOW,
  });
  expect(listings[0]!.companyType).toBe("direct");
  expect(listings[0]!.dateUpdated).toBe(NOW);
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `pnpm --filter pipeline test merge`
Expected: FAIL — `companyType` not on the built listing; not compared.

- [ ] **Step 3: Implement**

In `buildListing`, add to the returned object beside `industry`:

```typescript
    industry: posting.industry,
    companyType: posting.companyType,
```

In `COMPARED_FIELDS`, add `"companyType"` (next to `"industry"`):

```typescript
const COMPARED_FIELDS = [
  "company",
  "title",
  "locations",
  "workSetup",
  "level",
  "function",
  "industry",
  "companyType",
  "url",
  "source",
  "employmentType",
  "salary",
] as const;
```

- [ ] **Step 4: Run to verify pass**

Run: `pnpm --filter pipeline test merge`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add pipeline/src/merge.ts pipeline/tests/merge.test.ts
git commit -m "feat(pipeline): merge carries and compares companyType"
```

---

### Task 5: Add `type` to all 101 registry entries (data edit)

**Files:**
- Modify: `pipeline/companies.json`

- [ ] **Step 1: Edit every entry**

Add `"type": "direct"` or `"type": "agency"` to each of the 101 entries per the
classification in §0.3 (insert it right after `"industry"` to match the canonical key
order in `types.ts`). Resolve the seven borderline cases (§0.3) per the maintainer's call
recorded in Open Question Q3.

- [ ] **Step 2: Verify the registry still parses and the split is right**

Run:
```bash
pnpm --filter pipeline exec tsx -e "import {readFileSync} from 'node:fs';import {parseRegistry} from './src/files.js';const r=parseRegistry(JSON.parse(readFileSync('companies.json','utf8')));const a=r.companies.filter(c=>c.type==='agency').length;console.log('total',r.companies.length,'agency',a,'direct',r.companies.length-a);"
```
Expected: `total 101 agency 45 direct 56` (or the adjusted split if borderline cases were reclassified — note it in TRACKER).

- [ ] **Step 3: Commit**

```bash
git add pipeline/companies.json
git commit -m "data: tag all 101 registry companies direct|agency (SPEC §7)"
```

---

### Task 6: HTTP layer — optional redirect→not-found

**Files:**
- Modify: `pipeline/src/fetchers/http.ts`
- Test: `pipeline/tests/fetchers.test.ts`

BambooHR and Breezy answer an **unknown/inactive tenant** with a `3xx` redirect to a
marketing page rather than a `404`. The default `politeJsonGet` follows redirects and then
fails on `.json()`. Add an opt-in that treats a redirect as "not found" (→ dead-slug).

- [ ] **Step 1: Write a failing test**

Add near the other `politeJsonGet`-based tests in `pipeline/tests/fetchers.test.ts`
(import `politeJsonGet`):

```typescript
import { politeJsonGet } from "../src/fetchers/http.js";

describe("politeJsonGet redirectIsNotFound", () => {
  it("maps a 3xx to not-found when the option is set", async () => {
    const http = fakeHttp([{ status: 302 }]);
    const outcome = await politeJsonGet("https://x.example/list", {
      ...http,
      redirectIsNotFound: true,
    });
    expect(outcome.kind).toBe("not-found");
    expect(http.calls).toHaveLength(1); // no retry
  });

  it("still treats 3xx as an http error by default", async () => {
    const http = fakeHttp([{ status: 302 }]);
    const outcome = await politeJsonGet("https://x.example/list", http);
    expect(outcome.kind).toBe("http");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter pipeline test fetchers`
Expected: FAIL — option unknown; 302 currently returns `{kind:"http"}`.

- [ ] **Step 3: Implement**

In `http.ts`, extend `HttpDeps` and handle the redirect:

```typescript
export interface HttpDeps {
  fetchFn?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  /**
   * Treat any 3xx redirect as "not found" (→ dead-slug). BambooHR/Breezy redirect an
   * unknown or inactive tenant to a marketing page instead of returning 404. Off by
   * default so the six original fetchers are unchanged.
   */
  redirectIsNotFound?: boolean;
}
```

Inside `politeJsonGet`, request manual redirect handling when the option is on, and map a
redirect to `not-found` right after the fetch:

```typescript
      const response = await fetchFn(url, {
        headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
        ...(deps.redirectIsNotFound ? { redirect: "manual" as const } : {}),
      });
      if (response.status === 404) return { kind: "not-found" };
      if (
        deps.redirectIsNotFound &&
        (response.type === "opaqueredirect" ||
          (response.status >= 300 && response.status < 400))
      ) {
        return { kind: "not-found" };
      }
      if (response.ok) return { kind: "ok", body: await response.json() };
```

- [ ] **Step 4: Run to verify pass**

Run: `pnpm --filter pipeline test fetchers`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add pipeline/src/fetchers/http.ts pipeline/tests/fetchers.test.ts
git commit -m "feat(pipeline): optional redirect→not-found in polite HTTP layer"
```

---

### Task 7: BambooHR normalizer + fixture

**Files:**
- Create: `pipeline/tests/fixtures/bamboohr-kumu.json`
- Modify: `pipeline/src/normalize.ts`
- Test: `pipeline/tests/normalize.test.ts`

- [ ] **Step 1: Save the real fixture**

Save the real Kumu response (no JD text in this feed, so it's already safe). Capture with:
```bash
curl -sS -A "simplifytrabaho/0.1.0 (+https://github.com/yanicells/SimplifyTrabaho)" \
  "https://kumu.bamboohr.com/careers/list" -o pipeline/tests/fixtures/bamboohr-kumu.json
```
Confirm it looks like `{"meta":{"totalCount":N},"result":[{ "id", "jobOpeningName", "location", "atsLocation", "isRemote", "employmentStatusLabel" }, …]}` (the shape in §0.2).

- [ ] **Step 2: Write failing tests**

Add to `pipeline/tests/normalize.test.ts`:

```typescript
import bambooKumu from "./fixtures/bamboohr-kumu.json" with { type: "json" };

const kumu = {
  name: "Kumu", ats: "bamboohr" as const, slug: "kumu",
  industry: "consumer", type: "direct" as const, verified: true, added: "2026-06-13",
};

describe("normalizeBambooHr", () => {
  it("maps title, constructed apply URL, locations, and employment type", () => {
    const postings = normalizeBambooHr(kumu, bambooKumu);
    expect(postings.length).toBeGreaterThan(0);
    const intern = postings.find((p) => /intern/i.test(p.title))!;
    expect(intern.url).toBe(`https://kumu.bamboohr.com/careers/${(bambooKumu as any).result.find((r:any)=>/intern/i.test(r.jobOpeningName)).id}`);
    expect(intern.employmentType).toBe("internship");
    expect(intern.companyType).toBe("direct");
    expect(intern.source).toBe("bamboohr");
    expect(intern.publishedAt).toBeNull(); // BambooHR list feed has no date
    expect(intern.locations.join(" ")).toMatch(/Makati|Philippines/);
  });
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `pnpm --filter pipeline test normalize`
Expected: FAIL — `normalizeBambooHr` not defined.

- [ ] **Step 4: Implement `normalizeBambooHr`**

Add to `pipeline/src/normalize.ts`:

```typescript
interface BambooHrJob {
  id?: unknown;
  jobOpeningName?: unknown;
  employmentStatusLabel?: unknown;
  isRemote?: unknown;
  location?: { city?: unknown; state?: unknown };
  atsLocation?: { country?: unknown; province?: unknown; state?: unknown; city?: unknown };
}

function mapBambooEmployment(label: string): EmploymentType {
  const l = label.toLowerCase();
  if (l.includes("intern")) return "internship";
  if (l.includes("part")) return "part-time";
  if (l.includes("contract") || l.includes("contractor")) return "contract";
  if (l.includes("full") || l.includes("regular") || l.includes("probationary")) return "full-time";
  return "unknown";
}

export function normalizeBambooHr(company: RegistryCompany, raw: unknown): FetchedPosting[] {
  const result = (raw as { result?: unknown })?.result;
  if (!Array.isArray(result)) {
    throw new Error(`bamboohr payload for ${company.slug} has no result array`);
  }
  return result.map((job: BambooHrJob) => {
    const ats = job.atsLocation ?? {};
    const loc = job.location ?? {};
    // Prefer the structured atsLocation (has country); fall back to location {city,state}.
    const parts = [
      String(ats.city ?? loc.city ?? "").trim(),
      String(ats.province ?? ats.state ?? loc.state ?? "").trim(),
      String(ats.country ?? "").trim(),
    ].filter(Boolean);
    const locations = parts.length > 0 ? [parts.join(", ")] : [];
    const title = String(job.jobOpeningName ?? "");
    return {
      company: company.name,
      source: "bamboohr",
      title,
      locations,
      url: `https://${company.slug}.bamboohr.com/careers/${String(job.id ?? "")}`,
      workSetup: job.isRemote === true ? "remote" : workSetupFromText(title),
      employmentType: mapBambooEmployment(String(job.employmentStatusLabel ?? "")),
      salary: null,
      publishedAt: null, // list feed carries no published date (SPEC §6 first-seen fallback)
      industry: company.industry,
      companyType: company.type,
    } satisfies FetchedPosting;
  });
}
```

- [ ] **Step 5: Run to verify pass**

Run: `pnpm --filter pipeline test normalize`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add pipeline/src/normalize.ts pipeline/tests/normalize.test.ts pipeline/tests/fixtures/bamboohr-kumu.json
git commit -m "feat(pipeline): BambooHR normalizer + real Kumu fixture"
```

---

### Task 8: BambooHR fetcher

**Files:**
- Create: `pipeline/src/fetchers/bamboohr.ts`
- Test: `pipeline/tests/fetchers.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
import { fetchBambooHr } from "../src/fetchers/bamboohr.js";

describe("fetchBambooHr", () => {
  const kumu = registryCompany({ name: "Kumu", ats: "bamboohr", slug: "kumu", type: "direct" });

  it("hits {slug}.bamboohr.com/careers/list and normalizes", async () => {
    const http = fakeHttp([{
      status: 200,
      body: { meta: { totalCount: 1 }, result: [
        { id: "319", jobOpeningName: "Marketing intern",
          atsLocation: { country: "Philippines", province: "NCR", city: "Makati" },
          employmentStatusLabel: "Intern", isRemote: null },
      ] },
    }]);
    const result = await fetchBambooHr(kumu, http);
    expect(http.calls[0]!.url).toBe("https://kumu.bamboohr.com/careers/list");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.postings[0]!.title).toBe("Marketing intern");
  });

  it("treats a live board with zero jobs as a successful empty fetch", async () => {
    const http = fakeHttp([{ status: 200, body: { meta: { totalCount: 0 }, result: [] } }]);
    const result = await fetchBambooHr(kumu, http);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.postings).toHaveLength(0);
  });

  it("treats a redirect (unknown tenant) as dead-slug", async () => {
    const http = fakeHttp([{ status: 302 }]);
    expect(await fetchBambooHr(kumu, http)).toMatchObject({ ok: false, errorKind: "dead-slug" });
    expect(http.calls).toHaveLength(1);
  });
});
```

(Update the `registryCompany` helper in this test file to include `type: "direct"` in its defaults so all existing fetcher tests keep typechecking.)

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter pipeline test fetchers`
Expected: FAIL — `fetchBambooHr` not defined.

- [ ] **Step 3: Implement**

```typescript
import { normalizeBambooHr } from "../normalize.js";
import type { FetchResult, RegistryCompany } from "../types.js";
import { politeJsonGet, type HttpDeps } from "./http.js";

export function bambooHrUrl(slug: string): string {
  return `https://${encodeURIComponent(slug)}.bamboohr.com/careers/list`;
}

// BambooHR public careers feed (verified live 2026-06-13): anonymous JSON
// `{ meta:{totalCount}, result:[…] }`. Unknown/inactive tenants 3xx-redirect to a
// marketing page instead of 404ing, so we opt into redirect→dead-slug. A live board
// with zero jobs (`result:[]`) is a successful empty fetch — keeps PH-HQ entries.
export async function fetchBambooHr(
  company: RegistryCompany,
  deps: HttpDeps = {},
): Promise<FetchResult> {
  const outcome = await politeJsonGet(bambooHrUrl(company.slug), {
    ...deps,
    redirectIsNotFound: true,
  });
  switch (outcome.kind) {
    case "ok":
      try {
        return { ok: true, postings: normalizeBambooHr(company, outcome.body) };
      } catch (error) {
        return { ok: false, errorKind: "http", detail: error instanceof Error ? error.message : String(error) };
      }
    case "not-found":
      return { ok: false, errorKind: "dead-slug", detail: `board not found: ${company.slug}` };
    case "http":
      return { ok: false, errorKind: "http", detail: `HTTP ${outcome.status}` };
    case "network":
      return { ok: false, errorKind: "network", detail: outcome.message };
  }
}
```

- [ ] **Step 4: Run to verify pass**

Run: `pnpm --filter pipeline test fetchers`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add pipeline/src/fetchers/bamboohr.ts pipeline/tests/fetchers.test.ts
git commit -m "feat(pipeline): BambooHR fetcher (redirect→dead-slug, empty=live)"
```

---

### Task 9: Breezy normalizer + fixture

**Files:**
- Create: `pipeline/tests/fixtures/breezy-sample.json`
- Modify: `pipeline/src/normalize.ts`
- Test: `pipeline/tests/normalize.test.ts`

- [ ] **Step 1: Save the real fixture**

```bash
curl -sS -A "simplifytrabaho/0.1.0 (+https://github.com/yanicells/SimplifyTrabaho)" \
  "https://breezy.breezy.hr/json" -o pipeline/tests/fixtures/breezy-sample.json
```
(Replace with a verified PH Breezy board's response if Task 17 finds one; the trial board confirms the shape. The list feed contains no JD text.)

- [ ] **Step 2: Write failing tests**

```typescript
import breezySample from "./fixtures/breezy-sample.json" with { type: "json" };

const breezyCo = {
  name: "Breezy Sample", ats: "breezy" as const, slug: "breezy",
  industry: "saas", type: "direct" as const, verified: true, added: "2026-06-13",
};

describe("normalizeBreezy", () => {
  it("maps title, provided apply URL, published date, location, salary", () => {
    const postings = normalizeBreezy(breezyCo, breezySample);
    const p = postings[0]!;
    expect(p.title).toBe((breezySample as any)[0].name);
    expect(p.url).toBe((breezySample as any)[0].url);
    expect(p.publishedAt).toBe(new Date((breezySample as any)[0].published_date).toISOString());
    expect(p.source).toBe("breezy");
    expect(p.companyType).toBe("direct");
  });
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `pnpm --filter pipeline test normalize`
Expected: FAIL — `normalizeBreezy` not defined.

- [ ] **Step 4: Implement `normalizeBreezy`**

```typescript
interface BreezyJob {
  name?: unknown;
  url?: unknown;
  published_date?: unknown;
  type?: { name?: unknown };
  salary?: unknown;
  location?: {
    name?: unknown;
    city?: unknown;
    is_remote?: unknown;
    country?: { name?: unknown };
  };
}

export function normalizeBreezy(company: RegistryCompany, raw: unknown): FetchedPosting[] {
  if (!Array.isArray(raw)) {
    throw new Error(`breezy payload for ${company.slug} is not a postings array`);
  }
  return raw.map((job: BreezyJob) => {
    const loc = job.location ?? {};
    const locationName =
      String(loc.name ?? "").trim() ||
      [String(loc.city ?? "").trim(), String(loc.country?.name ?? "").trim()]
        .filter(Boolean)
        .join(", ");
    const salary = typeof job.salary === "string" && job.salary.trim() !== "" ? job.salary.trim() : null;
    return {
      company: company.name,
      source: "breezy",
      title: String(job.name ?? ""),
      locations: locationName ? [locationName] : [],
      url: String(job.url ?? ""),
      workSetup: loc.is_remote === true ? "remote" : workSetupFromText(locationName),
      employmentType: mapCommitment(job.type?.name),
      salary,
      publishedAt: toIsoUtc(job.published_date as string | null | undefined),
      industry: company.industry,
      companyType: company.type,
    } satisfies FetchedPosting;
  });
}
```

- [ ] **Step 5: Run to verify pass**

Run: `pnpm --filter pipeline test normalize`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add pipeline/src/normalize.ts pipeline/tests/normalize.test.ts pipeline/tests/fixtures/breezy-sample.json
git commit -m "feat(pipeline): Breezy normalizer + real fixture"
```

---

### Task 10: Breezy fetcher

**Files:**
- Create: `pipeline/src/fetchers/breezy.ts`
- Test: `pipeline/tests/fetchers.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
import { fetchBreezy } from "../src/fetchers/breezy.js";

describe("fetchBreezy", () => {
  const co = registryCompany({ name: "Breezy Co", ats: "breezy", slug: "acme", type: "direct" });

  it("hits {slug}.breezy.hr/json and normalizes", async () => {
    const http = fakeHttp([{
      status: 200,
      body: [{ name: "Engineer", url: "https://acme.breezy.hr/p/x",
        published_date: "2026-06-01T00:00:00.000Z",
        location: { name: "Manila, Philippines", is_remote: false } }],
    }]);
    const result = await fetchBreezy(co, http);
    expect(http.calls[0]!.url).toBe("https://acme.breezy.hr/json");
    expect(result.ok).toBe(true);
  });

  it("treats a redirect (unknown tenant) as dead-slug", async () => {
    const http = fakeHttp([{ status: 302 }]);
    expect(await fetchBreezy(co, http)).toMatchObject({ ok: false, errorKind: "dead-slug" });
  });

  it("treats [] as a successful empty fetch", async () => {
    const http = fakeHttp([{ status: 200, body: [] }]);
    const result = await fetchBreezy(co, http);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.postings).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter pipeline test fetchers`
Expected: FAIL — `fetchBreezy` not defined.

- [ ] **Step 3: Implement**

```typescript
import { normalizeBreezy } from "../normalize.js";
import type { FetchResult, RegistryCompany } from "../types.js";
import { politeJsonGet, type HttpDeps } from "./http.js";

export function breezyUrl(slug: string): string {
  return `https://${encodeURIComponent(slug)}.breezy.hr/json`;
}

// Breezy public feed (verified live 2026-06-13): anonymous JSON array, apply URL and
// published date included, no JD text. Unknown tenants 3xx-redirect to breezy.hr.
export async function fetchBreezy(
  company: RegistryCompany,
  deps: HttpDeps = {},
): Promise<FetchResult> {
  const outcome = await politeJsonGet(breezyUrl(company.slug), {
    ...deps,
    redirectIsNotFound: true,
  });
  switch (outcome.kind) {
    case "ok":
      try {
        return { ok: true, postings: normalizeBreezy(company, outcome.body) };
      } catch (error) {
        return { ok: false, errorKind: "http", detail: error instanceof Error ? error.message : String(error) };
      }
    case "not-found":
      return { ok: false, errorKind: "dead-slug", detail: `board not found: ${company.slug}` };
    case "http":
      return { ok: false, errorKind: "http", detail: `HTTP ${outcome.status}` };
    case "network":
      return { ok: false, errorKind: "network", detail: outcome.message };
  }
}
```

- [ ] **Step 4: Run to verify pass**

Run: `pnpm --filter pipeline test fetchers`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add pipeline/src/fetchers/breezy.ts pipeline/tests/fetchers.test.ts
git commit -m "feat(pipeline): Breezy fetcher"
```

---

### Task 11: Manatal normalizer + fixture (drop the JD `description`)

**Files:**
- Create: `pipeline/tests/fixtures/manatal-manatal.json`
- Modify: `pipeline/src/normalize.ts`
- Test: `pipeline/tests/normalize.test.ts`

- [ ] **Step 1: Save the real fixture WITH `description` stripped**

The Manatal feed includes a full-HTML `description` (JD text — rule §3.3). Strip it before
committing the fixture, exactly like the Lever fixture's truncated JD fields:
```bash
curl -sS -A "simplifytrabaho/0.1.0 (+https://github.com/yanicells/SimplifyTrabaho)" \
  "https://www.careers-page.com/api/v1.0/c/manatal/jobs/?page_size=20&page=1" |
  node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const j=JSON.parse(s);j.results=j.results.map(r=>({...r,description:'[stripped]'}));process.stdout.write(JSON.stringify(j,null,2));})" \
  > pipeline/tests/fixtures/manatal-manatal.json
```

- [ ] **Step 2: Write failing tests**

```typescript
import manatalSample from "./fixtures/manatal-manatal.json" with { type: "json" };

const manatalCo = {
  name: "Manatal", ats: "manatal" as const, slug: "manatal",
  industry: "hr-tech", type: "direct" as const, verified: true, added: "2026-06-13",
};

describe("normalizeManatal", () => {
  it("maps title + constructed apply URL and NEVER reads description", () => {
    const postings = normalizeManatal(manatalCo, manatalSample);
    const first = (manatalSample as any).results[0];
    const p = postings[0]!;
    expect(p.title).toBe(first.position_name);
    expect(p.url).toBe(`https://www.careers-page.com/manatal/job/${first.hash}`);
    expect(p.source).toBe("manatal");
    expect(p.companyType).toBe("direct");
    // No field should ever carry HTML/JD text.
    expect(JSON.stringify(p)).not.toMatch(/<p>|<strong>|description/i);
  });
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `pnpm --filter pipeline test normalize`
Expected: FAIL — `normalizeManatal` not defined.

- [ ] **Step 4: Implement `normalizeManatal`** (note: `description` is never destructured)

```typescript
interface ManatalJob {
  hash?: unknown;
  position_name?: unknown;
  country?: unknown;
  state?: unknown;
  city?: unknown;
  // `description` (JD HTML) is intentionally NOT in this interface — never read it.
}

export function normalizeManatal(company: RegistryCompany, raw: unknown): FetchedPosting[] {
  const results = (raw as { results?: unknown })?.results;
  if (!Array.isArray(results)) {
    throw new Error(`manatal payload for ${company.slug} has no results array`);
  }
  return results.map((job: ManatalJob) => {
    const locationParts = [
      String(job.city ?? "").trim(),
      String(job.state ?? "").trim(),
      String(job.country ?? "").trim(),
    ].filter(Boolean);
    const locations = locationParts.length > 0 ? [locationParts.join(", ")] : [];
    const title = String(job.position_name ?? "");
    return {
      company: company.name,
      source: "manatal",
      title,
      locations,
      url: `https://www.careers-page.com/${encodeURIComponent(company.slug)}/job/${String(job.hash ?? "")}`,
      workSetup: workSetupFromText(`${title} ${locations.join(" ")}`),
      employmentType: "unknown",
      salary: null,
      publishedAt: null, // list feed carries no published date
      industry: company.industry,
      companyType: company.type,
    } satisfies FetchedPosting;
  });
}
```

- [ ] **Step 5: Run to verify pass**

Run: `pnpm --filter pipeline test normalize`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add pipeline/src/normalize.ts pipeline/tests/normalize.test.ts pipeline/tests/fixtures/manatal-manatal.json
git commit -m "feat(pipeline): Manatal normalizer + JD-stripped fixture"
```

---

### Task 12: Manatal fetcher (paginated)

**Files:**
- Create: `pipeline/src/fetchers/manatal.ts`
- Test: `pipeline/tests/fetchers.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
import { fetchManatal } from "../src/fetchers/manatal.js";

describe("fetchManatal", () => {
  const co = registryCompany({ name: "Manatal", ats: "manatal", slug: "manatal", type: "direct" });

  it("paginates via the next URL until null", async () => {
    const http = fakeHttp([
      { status: 200, body: { count: 2, next: "https://www.careers-page.com/api/v1.0/c/manatal/jobs/?page=2&page_size=1", previous: null, results: [{ hash: "A", position_name: "One", country: "Philippines", city: "Makati" }] } },
      { status: 200, body: { count: 2, next: null, previous: "x", results: [{ hash: "B", position_name: "Two", country: "Philippines", city: "Cebu" }] } },
    ]);
    const result = await fetchManatal(co, http);
    expect(http.calls[0]!.url).toContain("/api/v1.0/c/manatal/jobs/?page_size=");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.postings.map((p) => p.title)).toEqual(["One", "Two"]);
  });

  it("reports dead-slug on 404 (unknown client)", async () => {
    const http = fakeHttp([{ status: 404, body: { detail: "No ClientPortalSettings matches…" } }]);
    expect(await fetchManatal(co, http)).toMatchObject({ ok: false, errorKind: "dead-slug" });
  });

  it("treats an empty results page as a successful empty fetch", async () => {
    const http = fakeHttp([{ status: 200, body: { count: 0, next: null, previous: null, results: [] } }]);
    const result = await fetchManatal(co, http);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.postings).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter pipeline test fetchers`
Expected: FAIL — `fetchManatal` not defined.

- [ ] **Step 3: Implement** (paginate by following `next`, cap pages like SmartRecruiters)

```typescript
import { normalizeManatal } from "../normalize.js";
import type { FetchedPosting, FetchResult, RegistryCompany } from "../types.js";
import { politeJsonGet, type HttpDeps } from "./http.js";

const PAGE_SIZE = 100;
const MAX_PAGES = 20; // 2,000 postings cap — no single PH client is anywhere near this

export function manatalUrl(slug: string): string {
  return `https://www.careers-page.com/api/v1.0/c/${encodeURIComponent(slug)}/jobs/?page_size=${PAGE_SIZE}&page=1`;
}

// Manatal public career-page API (verified live 2026-06-13): anonymous, paginated JSON
// `{ count, next, previous, results:[…] }`. Unknown client → 404. The list carries a JD
// `description` we never read (normalizeManatal drops it). Empty results = live empty.
export async function fetchManatal(
  company: RegistryCompany,
  deps: HttpDeps = {},
): Promise<FetchResult> {
  const postings: FetchedPosting[] = [];
  let url: string | null = manatalUrl(company.slug);
  let pages = 0;

  while (url && pages < MAX_PAGES) {
    const outcome = await politeJsonGet(url, deps);
    if (outcome.kind === "not-found") {
      return { ok: false, errorKind: "dead-slug", detail: `client not found: ${company.slug}` };
    }
    if (outcome.kind === "http") return { ok: false, errorKind: "http", detail: `HTTP ${outcome.status}` };
    if (outcome.kind === "network") return { ok: false, errorKind: "network", detail: outcome.message };
    try {
      postings.push(...normalizeManatal(company, outcome.body));
    } catch (error) {
      return { ok: false, errorKind: "http", detail: error instanceof Error ? error.message : String(error) };
    }
    const next = (outcome.body as { next?: unknown }).next;
    url = typeof next === "string" && next !== "" ? next : null;
    pages += 1;
  }
  return { ok: true, postings };
}
```

- [ ] **Step 4: Run to verify pass**

Run: `pnpm --filter pipeline test fetchers`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add pipeline/src/fetchers/manatal.ts pipeline/tests/fetchers.test.ts
git commit -m "feat(pipeline): Manatal fetcher (paginated, JD never fetched twice)"
```

---

### Task 13: Wire the 3 fetchers into `cli.ts` and `verify-registry.ts`; verify-registry stamps `type`

**Files:**
- Modify: `pipeline/src/cli.ts`, `pipeline/src/verify-registry.ts`

- [ ] **Step 1: Register fetchers in `cli.ts`**

Add imports and entries to the `FETCHERS` map:

```typescript
import { fetchBambooHr } from "./fetchers/bamboohr.js";
import { fetchBreezy } from "./fetchers/breezy.js";
import { fetchManatal } from "./fetchers/manatal.js";
```
```typescript
const FETCHERS: Record<RegistryCompany["ats"], Fetcher> = {
  greenhouse: fetchGreenhouse,
  lever: fetchLever,
  ashby: fetchAshby,
  workable: fetchWorkable,
  smartrecruiters: fetchSmartRecruiters,
  recruitee: fetchRecruitee,
  bamboohr: fetchBambooHr,
  breezy: fetchBreezy,
  manatal: fetchManatal,
};
```
Change the `writeFileSync(LISTINGS_PATH, …)` literal `version: 2` → `version: 3`.

- [ ] **Step 2: Register fetchers in `verify-registry.ts` and stamp `type`**

Add the same three imports and entries to its `FETCHERS` map. Then add `type` to the
`Candidate` interface and to the probe/verified entries:

```typescript
interface Candidate {
  name: string;
  industry: string;
  type?: CompanyType; // defaults to "direct" — round 3 chases direct employers
  phHq?: boolean;
  tries: Array<{ ats: AtsSource; slug: string }>;
}
```
In the loop where `probe` is built, set `type: candidate.type ?? "direct"`, and when the
verified entry is created (`verifiedEntry = { ...probe, verified: true, … }`) the `type`
rides along from `probe`. Import `CompanyType` from `./types.js`.

- [ ] **Step 3: Typecheck the whole pipeline**

Run: `pnpm --filter pipeline typecheck`
Expected: PASS (all the Task-1 breakage is now resolved).

- [ ] **Step 4: Commit**

```bash
git add pipeline/src/cli.ts pipeline/src/verify-registry.ts
git commit -m "feat(pipeline): wire BambooHR/Breezy/Manatal fetchers; verify-registry stamps type; write v3"
```

---

### Task 14: `recategorize` = v2→v3 migration (stamp `companyType` from registry)

**Files:**
- Modify: `pipeline/src/backfill.ts`, `pipeline/src/recategorize.ts`
- Test: `pipeline/tests/backfill.test.ts`

- [ ] **Step 1: Write failing tests**

In `pipeline/tests/backfill.test.ts`:

```typescript
it("migrates v2 → v3 and stamps companyType from the registry", () => {
  const registry = { version: 1 as const, companies: [
    { name: "Kumu", ats: "bamboohr" as const, slug: "kumu", industry: "consumer", type: "direct" as const, verified: true, added: "2026-06-13" },
    { name: "Emapta", ats: "workable" as const, slug: "emapta", industry: "outsourcing", type: "agency" as const, verified: true, added: "2026-06-11" },
  ] };
  const v2 = { version: 2, updatedAt: "2026-06-12T00:00:00.000Z", listings: [
    { id: "a", company: "Kumu", title: "Intern", locations: ["Makati, Philippines"], workSetup: "onsite", level: "internship", function: "other", industry: "consumer", metro: ["ncr"], url: "u1", source: "bamboohr", employmentType: "internship", salary: null, datePosted: "2026-06-01T00:00:00.000Z", dateUpdated: "2026-06-01T00:00:00.000Z", active: true },
    { id: "b", company: "Emapta", title: "Agent", locations: ["Manila, Philippines"], workSetup: "onsite", level: "entry", function: "customer-support", industry: "outsourcing", metro: ["ncr"], url: "u2", source: "workable", employmentType: "full-time", salary: null, datePosted: "2026-06-01T00:00:00.000Z", dateUpdated: "2026-06-01T00:00:00.000Z", active: true },
  ] };
  const { file } = recategorizeDataset(v2, registry as any);
  expect(file.version).toBe(3);
  expect(file.listings.find((l) => l.company === "Kumu")!.companyType).toBe("direct");
  expect(file.listings.find((l) => l.company === "Emapta")!.companyType).toBe("agency");
});

it("leaves companyType direct when the company is missing from the registry", () => {
  const v2 = { version: 2, updatedAt: "t", listings: [
    { id: "a", company: "Gone", title: "X", locations: [], workSetup: "unknown", level: "unknown", function: "other", industry: "", metro: [], url: "u", source: "lever", employmentType: "unknown", salary: null, datePosted: "2026-06-01T00:00:00.000Z", dateUpdated: "2026-06-01T00:00:00.000Z", active: false },
  ] };
  const { file } = recategorizeDataset(v2, { version: 1, companies: [] } as any);
  expect(file.listings[0]!.companyType).toBe("direct"); // safe default; inactive history
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `pnpm --filter pipeline test backfill`
Expected: FAIL — output is v2; no `companyType`.

- [ ] **Step 3: Implement**

In `recategorizeDataset`:
- Accept v2 or v3 (v1 is long migrated): change the guard to
  `if (obj?.version !== 2 && obj?.version !== 3) throw new Error("recategorize: unsupported listings version (expected 2 or 3)")`.
- Build `const typeByCompany = new Map(registry.companies.map((c) => [c.name, c.type]));`.
- In the per-listing rebuild, compute `const companyType = typeByCompany.get(old.company) ?? "direct";` and add `companyType,` after `industry,` in the returned object.
- Change the returned file to `{ version: 3, updatedAt: obj.updatedAt, listings }`.

In `recategorize.ts`, change the log line `v${String(before)} → v2` to `→ v3`.

- [ ] **Step 4: Run to verify pass**

Run: `pnpm --filter pipeline test backfill`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add pipeline/src/backfill.ts pipeline/src/recategorize.ts pipeline/tests/backfill.test.ts
git commit -m "feat(pipeline): recategorize is the v2→v3 migration (stamps companyType)"
```

---

### Task 15: README featured table → direct employers only (SPEC §11)

**Files:**
- Modify: `pipeline/src/readme.ts`
- Test: `pipeline/tests/readme.test.ts`

- [ ] **Step 1: Write a failing test**

In `pipeline/tests/readme.test.ts` (give the test listings a `companyType`):

```typescript
it("excludes agency listings from the featured table", () => {
  const base = { /* a recent active internship-level listing helper */ };
  const md = generateReadme({
    listings: [
      { ...base, id: "1", company: "Kumu", companyType: "direct" },
      { ...base, id: "2", company: "Emapta", companyType: "agency" },
    ],
    companiesTracked: 2,
    updatedAt: "2026-06-13T00:00:00.000Z",
  });
  expect(md).toContain("Kumu");
  expect(md).not.toContain("Emapta");
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter pipeline test readme`
Expected: FAIL — Emapta still appears (and/or type error on the literals).

- [ ] **Step 3: Implement**

In `generateReadme`, add the direct-only condition to the `featured` filter:

```typescript
  const featured = listings
    .filter(
      (l) =>
        l.active &&
        l.companyType === "direct" &&
        (l.level === "internship" || l.level === "entry") &&
        nowMs - Date.parse(l.datePosted) <= FEATURED_WINDOW_DAYS * DAY_MS,
    )
```

Also update the "How this works" sentence to include the new sources:
`…public ATS APIs (Greenhouse, Lever, Ashby, Workable, SmartRecruiters, Recruitee, BambooHR, Breezy, Manatal)…`.

- [ ] **Step 4: Run to verify pass**

Run: `pnpm --filter pipeline test readme`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add pipeline/src/readme.ts pipeline/tests/readme.test.ts
git commit -m "feat(pipeline): README featured table is direct-employers-only (SPEC §11)"
```

---

### Task 16: SPEC §6/§5.1/§7 update (same commit family as the schema change)

**Files:**
- Modify: `docs/SPEC.md`

- [ ] **Step 1: Update §6**
  - Bump the jsonc example `"version": 2` → `3` and adjust the version comment to mention `companyType` (Phase 9).
  - Add a `companyType` row to the Listing table after `industry`:
    `| `companyType` | enum | **Schema v3 (Phase 9).** `direct` \| `agency`, copied from the company's registry entry at normalization (SPEC §7/§11). |`
  - Add `bamboohr`, `breezy`, `manatal` to the `source` field's enum list.

- [ ] **Step 2: Update §5.1**
  - Add three rows to the fetchers table (BambooHR `…/careers/list`, Breezy `…/breezy.hr/json`, Manatal `…/careers-page.com/api/v1.0/c/{slug}/jobs/`).
  - Replace the "Phase 9 candidates to evaluate" paragraph with the probe verdicts from §0.1 (Freshteam OUT — no public feed; BambooHR/Breezy/Manatal IN; Personio IN-but-deferred (XML); Teamtailor/Jobvite/Zoho OUT — auth required).

- [ ] **Step 3: Update §7** — note that `parseRegistry` now **requires** `type`.

- [ ] **Step 4: Commit**

```bash
git add docs/SPEC.md
git commit -m "docs(spec): schema v3 companyType, new Tier-A ATS rows, Phase 9 probe verdicts"
```

---

### Task 17: Round-3 verification + migrate data + refresh

**Files:**
- Modify: `pipeline/candidates.json`, `data/listings.json` (generated), `README.md` (generated), `pipeline/companies.json` (generated additions)

- [ ] **Step 1: Replace `candidates.json` with the round-3 list (§0.4)**

Use the candidates.json format (`{ candidates: [ { name, industry, type?, phHq?, tries:[{ats,slug}] } ] }`).
Kumu goes straight to the registry (already confirmed) — add it directly to
`companies.json` as `{ "name": "Kumu", "ats": "bamboohr", "slug": "kumu", "industry": "consumer", "type": "direct", "verified": true, "added": "2026-06-13", "notes": "…N PH postings" }`. The rest go in `candidates.json` with `type: "direct"` and best-guess slugs across `bamboohr`/`breezy`/`manatal` (Batch A) and the existing ATSs (Batch B).

- [ ] **Step 2: Migrate the committed dataset to v3 BEFORE refreshing**

`pnpm refresh` now rejects the committed v2 `listings.json`. Run the migration first:

Run: `pnpm --filter pipeline recategorize`
Expected: prints `schema v2 → v3, N listings`, stamps `companyType` on every listing.

- [ ] **Step 3: Run the registry verification probe**

Run: `pnpm --filter pipeline verify-registry`
Expected: prints `✅`/`MISS`/`LIVE` per candidate, merges verified ones into
`companies.json`, and prints TRACKER-format failure lines for the rest. Heed the
`CONFIRM-IDENTITY` warning for any PH-HQ 0-posting verification (the lever:maya lesson).

- [ ] **Step 4: Full refresh end-to-end**

Run: `pnpm refresh`
Expected: all verified companies fetched (new ATSs included), exit 0, valid v3
`listings.json` + regenerated `README.md`, coverage report printed. Confirm the run
summary shows the new BambooHR/Breezy/Manatal companies and that the README featured table
shows only direct employers.

- [ ] **Step 5: Spot-check no JD text leaked (esp. Manatal `description`)**

Run:
```bash
node -e "const d=require('./data/listings.json');const bad=d.listings.filter(l=>/<p>|<div>|<strong>/.test(JSON.stringify(l)));console.log('html-bearing listings:',bad.length)"
```
Expected: `0`.

- [ ] **Step 6: Commit data**

```bash
git add pipeline/candidates.json pipeline/companies.json data/listings.json README.md data/fetch-state.json
git commit -m "data: Phase 9 round-3 — new direct employers + BambooHR/Breezy/Manatal coverage"
```

---

### Task 18: Web — `companyType` on `Job` + build-time validation

**Files:**
- Modify: `web/lib/listings.ts`
- Test: `web/lib/listings.test.ts`

- [ ] **Step 1: Write a failing test**

In `web/lib/listings.test.ts`, add `companyType` to the valid-listing helper and assert
the build rejects a bad value and passes a good one through to `Job`:

```typescript
it("passes companyType through to the Job and validates the enum", () => {
  const file = parseListingsFile(fileWith([{ ...validListing, companyType: "agency" }]));
  expect(toJobs(file).jobs[0]!.companyType).toBe("agency");
});

it("fails the build on an invalid companyType", () => {
  expect(() => parseListingsFile(fileWith([{ ...validListing, companyType: "vendor" }]))).toThrow(/companyType/i);
});
```

(Update the existing valid-listing fixture in this test to include `companyType: "direct"` and `version: 3` so the suite typechecks/passes; flip the version assertions from 2 to 3.)

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter web test`
Expected: FAIL — `companyType` not validated/passed; version mismatch.

- [ ] **Step 3: Implement**

In `web/lib/listings.ts`:
- Import `CompanyType` from `../../pipeline/src/types` and add to `Job`:
  ```typescript
  /** Registry employer type (schema v3) — drives the employer-type filter. */
  companyType: CompanyType;
  ```
- Add `"bamboohr", "breezy", "manatal"` to the `SOURCES` array.
- In `parseListing`, validate it:
  ```typescript
  const companyType = requireEnum(obj, where, "companyType", ["direct", "agency"] as const);
  ```
  and include `companyType` in the returned `Listing`.
- In `parseListingsFile`, change the version check to `!== 3` with the message
  `"must be 3 (run recategorize to migrate v2 data)"`, and return `version: 3`.
- In `toJobs`, copy `companyType: l.companyType` into the `job` object.

- [ ] **Step 4: Run to verify pass**

Run: `pnpm --filter web test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/lib/listings.ts web/lib/listings.test.ts
git commit -m "feat(web): ship companyType to the client, validate v3 schema"
```

---

### Task 19: Web — employer-type in the filter codec

**Files:**
- Modify: `web/lib/filter-params.ts`
- Test: `web/lib/filter-params.test.ts`

- [ ] **Step 1: Write failing tests**

In `web/lib/filter-params.test.ts`:

```typescript
it("round-trips the employer type param", () => {
  const f = { ...defaultFilters(), type: "agency" as const };
  expect(filtersToSearch(f)).toContain("type=agency");
  expect(filtersFromSearch("?type=agency").type).toBe("agency");
});

it("drops a junk type value", () => {
  expect(filtersFromSearch("?type=banana").type).toBe("all");
});

it("keeps the default (all) out of the URL", () => {
  expect(filtersToSearch(defaultFilters())).not.toContain("type=");
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `pnpm --filter web test`
Expected: FAIL — `type` not on `Filters`.

- [ ] **Step 3: Implement**

In `web/lib/filter-params.ts`:
- Import `CompanyType` from the pipeline types.
- Add to `Filters`: `type: "all" | CompanyType;`.
- In `defaultFilters()`: `type: "all",`.
- In `filtersToSearch`: `if (filters.type !== "all") params.set("type", filters.type);`.
- In `filtersFromSearch`: add
  ```typescript
  const type = params.get("type");
  if (type === "direct" || type === "agency") filters.type = type;
  ```

- [ ] **Step 4: Run to verify pass**

Run: `pnpm --filter web test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/lib/filter-params.ts web/lib/filter-params.test.ts
git commit -m "feat(web): employer-type filter in the URL codec"
```

---

### Task 20: Web — enable the employer-type filter UI (flip the Phase 8 flag)

**Files:**
- Modify: `web/components/job-board.tsx`

- [ ] **Step 1: Flip the flag and wire the select**

- Set `const EMPLOYER_TYPE_FILTER_ENABLED = true;`.
- Destructure `type` from `filters` alongside `setup, metro, industry`.
- Give the existing employer-type `<select>` a controlled value + handler (it currently
  renders with no state):
  ```tsx
  {EMPLOYER_TYPE_FILTER_ENABLED && (
    <select
      value={type}
      onChange={(e) => patch({ type: e.target.value as Filters["type"] })}
      aria-label="Filter by employer type"
      className={`select ${fieldClass} pr-8`}
    >
      <option value="all">Any employer</option>
      <option value="direct">Direct employers</option>
      <option value="agency">Agencies</option>
    </select>
  )}
  ```
- Add to the filter predicate in the `filtered` memo (and its dependency array):
  ```typescript
  if (type !== "all" && job.companyType !== type) continue;
  ```
- Add to `advancedCount`: `+ (type !== "all" ? 1 : 0)`.

- [ ] **Step 2: Build the static site**

Run: `pnpm --filter web build`
Expected: PASS — static export builds against the v3 `data/listings.json`.

- [ ] **Step 3: Playwright-verify (per the working agreement)**

Start the built export, then with playwright on desktop + 390px mobile confirm: the
employer-type select appears in the advanced panel, selecting "Direct employers" filters
the list and bumps the filter count, the URL gains `?type=direct`, pasting that URL
reproduces the view, "Agencies" works, reset clears it, no console errors, no horizontal
overflow on mobile.

- [ ] **Step 4: Commit**

```bash
git add web/components/job-board.tsx
git commit -m "feat(web): enable the employer-type (direct/agency) filter"
```

---

### Task 21: Full verification sweep + TRACKER

**Files:**
- Modify: `TRACKER.md`

- [ ] **Step 1: Run everything**

Run: `pnpm test` (all workspaces) — expect green.
Run: `pnpm refresh` — expect 0 failures, valid v3 output, direct-only featured table.
Run: `pnpm --filter web build` — expect green.

- [ ] **Step 2: Update TRACKER.md**
  - Check off the Phase 9 items (Freshteam item → **cut**, replaced by BambooHR/Breezy/Manatal; note why in Decisions).
  - Move graveyard entries: **Kumu ➜✅ (bamboohr:kumu)**; mark **Thinking Machines — Freshteam has no public feed → unreachable under our rules** (Issues + graveyard).
  - Record the agency/direct mix (e.g. "registry now N companies, X direct / Y agency") and the round-3 result (≥25 new direct employers, or the documented dry well).
  - Decisions: schema v3 `companyType` denormalized (precedent: industry); Personio deferred (XML + EU-centric); Teamtailor/Jobvite/Zoho OUT (auth); employer-type filter live.

- [ ] **Step 3: Commit**

```bash
git add TRACKER.md
git commit -m "docs(tracker): Phase 9 complete — new ATSs, registry rebalance, graveyard updates"
```

---

## Test plan (summary)

- **Per-ATS normalizers** (`normalize.test.ts`): real fixtures (`bamboohr-kumu`,
  `breezy-sample`, `manatal-manatal` with `description` stripped); assert title/URL/
  locations/dates/employmentType/`companyType`/`source`, and — critically for Manatal —
  that **no field carries HTML/JD text**.
- **Per-ATS fetchers** (`fetchers.test.ts`): documented-endpoint URL, polite ≥1s gap,
  dead-slug mapping (BambooHR/Breezy redirect→dead-slug via the new HTTP option; Manatal
  404→dead-slug), live-empty = successful empty fetch, Manatal pagination via `next`.
- **HTTP layer**: `redirectIsNotFound` maps 3xx→not-found only when set; default behavior
  unchanged.
- **Schema/validation** (`files.test.ts` + `web/lib/listings.test.ts`): registry `type`
  required + enum-checked; listings file requires v3 (rejects v2); `companyType`
  validated and passed to `Job`.
- **Merge** (`merge.test.ts`): `companyType` carried onto the listing and in
  `COMPARED_FIELDS` (a reclassification bumps `dateUpdated`).
- **Backfill** (`backfill.test.ts`): v2→v3 migration stamps `companyType` from the
  registry; missing-company default; datePosted preserved, `updatedAt`/`dateUpdated`
  untouched (existing assertions).
- **README** (`readme.test.ts`): featured table excludes `agency` listings.
- **Web codec** (`filter-params.test.ts`): `type` round-trips, junk dropped, default stays
  out of the URL.
- **Web build + playwright**: build fails on invalid v3; live filter, URL share, mobile,
  zero console errors (Task 20).
- **Live data**: `pnpm refresh` 0-failure run; JD-leak spot-check returns 0.
- **Coverage**: `eval-categorizer` is unaffected (categorizer untouched this phase); the
  refresh summary still prints coverage.

---

## Open questions for the maintainer

- **Q1 — Thinking Machines / Freshteam.** Freshteam has **no public unauthenticated feed**
  (HTML-only + auth-gated API), so the SPEC's "Freshteam fetcher first, closes the TM
  graveyard entry" goal can't be met within the rules. The plan **cuts** the Freshteam
  fetcher and uses **Kumu via BambooHR** as the graveyard-closer instead. Thinking Machines
  stays unreachable unless you want to (a) pursue a PR/partnership route, or (b) revisit
  the HTML-scraping-is-out-of-scope rule (not recommended). **Confirm cutting Freshteam.**
- **Q2 — Personio.** Proven public but XML (new parser + dependency) and EU-centric
  (≈0 PH employers). Plan **defers** it. Build it now anyway, or park until a PH employer
  surfaces on Personio?
- **Q3 — Borderline classifications (§0.3).** SupportYourApp, Hello Rache, Xillium (tagged
  non-agency but services-for-clients), Welo Global, Tech Firefly, Arcanys, Callbox. My
  proposals are in §0.3 — please confirm or flip each before Task 5. (Each flip changes the
  45/56 split and what shows in the README featured table.)
- **Q4 — `companyType` naming.** I used `companyType` on the `Listing`/`Job` (registry
  keeps `type` per SPEC §7) to avoid overloading the bare word `type` on a listing and to
  keep the reserved URL param `type` unambiguous. OK, or prefer `type` everywhere to mirror
  `industry`?
- **Q5 — Round-3 slug guesses.** Batch A slugs (§0.4) are lowercased-name guesses; many
  will miss (PH startups move ATSs often, per the graveyard). If the new-ATS yield is thin
  after Task 17, is the ≥25 target met by **counting Batch B direct rechecks** (existing
  ATSs) toward it, or must the ≥25 be net-new companies?

---

## Self-review

- **Spec coverage:** §18 Phase 9 asks for: Freshteam-first fetcher (→ resolved as cut +
  replaced, Q1, with documented evidence), candidate-ATS probes (§0.1, all eight), fetchers
  for the public ones (Tasks 7–13: BambooHR/Breezy/Manatal; Personio deferred per Q2),
  registry `type` on every entry (Tasks 1/2/5), README featured direct-only (Task 15), web
  employer-type filter enabled (Tasks 18–20), round-3 ≥25 direct or documented dry well
  (Task 17 + §0.4 + Q5), agency/direct mix reported (Task 21). SPEC §6/§7 updated in the
  same commit family as the schema change (Task 16) per the CLAUDE.md rule. Covered.
- **Placeholder scan:** every code step shows real code; fixtures are captured from real
  responses (commands given); no "TBD"/"handle errors"/"similar to Task N".
- **Type consistency:** `companyType: CompanyType` is used identically on
  `FetchedPosting`, `Listing`, and `Job`; `RegistryCompany.type` is the registry source;
  `ListingsFile.version` is `3` everywhere (`files.ts`, `cli.ts`, `backfill.ts`,
  `web/lib/listings.ts`); fetcher names `fetchBambooHr`/`fetchBreezy`/`fetchManatal` and
  normalizer names `normalizeBambooHr`/`normalizeBreezy`/`normalizeManatal` match between
  their definition tasks and the wiring task; the HTTP option `redirectIsNotFound` matches
  between definition (Task 6) and use (Tasks 8/10).

---

## Execution handoff

Plan complete and saved to `docs/plans/phase-9-plan.md`. This is a **plan-only** stage —
no pipeline/web code was written. Two execution options for Stage 2:

1. **Subagent-Driven (recommended)** — dispatch a fresh subagent per task with two-stage
   review between tasks (superpowers:subagent-driven-development).
2. **Inline Execution** — execute tasks in this session with checkpoints
   (superpowers:executing-plans).

Resolve **Q1** (cut Freshteam) and **Q3** (borderline classifications) before Task 5/15,
and **Q2/Q5** before Task 17.
