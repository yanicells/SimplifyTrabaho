# Phase 9 Batch 1 Report

## Resume handling

Initial resume checks were run before reading or editing task files:

```text
$ git log --oneline -10
45423af docs: CLAUDE.md — verified codex mechanics, Fable credit-conservation rules
bb1f0d3 feat: update claude.md for workflows
ed0393c data: daily refresh
...
```

```text
$ git status --short
 M pipeline/src/types.ts
?? .pnpm-store/
```

`pipeline/src/types.ts` already contained the Task 1 schema edit. I verified its diff against the brief instead of recreating it, then committed only that file for Task 1. `.pnpm-store/` remained untracked and was never staged.

## Package-manager note

The prescribed pnpm command path was blocked by the installed Homebrew pnpm trying to fetch the repo-pinned pnpm executable from the network:

```text
$ pnpm --filter pipeline typecheck
[ERROR] GET https://registry.npmjs.org/@pnpm%2Fexe: fetch failed
For help, run: pnpm help run
```

The same fetch failure occurred for `pnpm --version`, `npm_config_manage_package_manager_versions=false pnpm --version`, `npm_config_pm_on_fail=ignore pnpm --version`, `pnpm --config.pm-on-fail=ignore --version`, and `pnpm --ignore-workspace typecheck` from `pipeline/`. Because dependencies were already installed under `pipeline/node_modules`, verification used the equivalent local binaries: `./node_modules/.bin/tsc`, `./node_modules/.bin/vitest`, and `node --import tsx`.

## Task 1 - schema v3 types

Committed `pipeline/src/types.ts` with the requested schema changes: new ATS ids, `CompanyType`, `RegistryCompany.type`, `Listing.companyType`, `FetchedPosting.companyType`, and `ListingsFile.version = 3`.

Expected-fail typecheck used the local TypeScript binary after pnpm startup failed:

```text
$ (cd pipeline && ./node_modules/.bin/tsc --noEmit)
src/backfill.ts(85,7): error TS1360: ... Property 'companyType' is missing ...
src/backfill.ts(90,13): error TS2322: Type '2' is not assignable to type '3'.
src/cli.ts(32,7): error TS2739: ... missing ... bamboohr, breezy, manatal
src/files.ts(37,11): error TS2741: Property 'type' is missing ...
src/files.ts(68,12): error TS2322: Type '2' is not assignable to type '3'.
src/merge.ts(14,3): error TS2741: Property 'companyType' is missing ...
src/normalize.ts(...): Property 'companyType' is missing ...
src/verify-registry.ts(...): missing ... bamboohr, breezy, manatal
tests/...: Property 'type'/'companyType' is missing ...
```

This matched the expected Task 1 breakage and included out-of-scope files called out in the batch instructions.

## Task 2 - files parsing

RED:

```text
$ (cd pipeline && ./node_modules/.bin/vitest run files)
RUN  v4.1.8 /Users/yanicells/Documents/dev/personal-projects/SimplifyTrabaho/pipeline
tests/files.test.ts (11 tests | 4 failed)
× rejects an invalid employer type
× rejects a registry entry missing type
× accepts a valid v3 file and the empty default
× rejects unsupported versions, including pre-migration v2
AssertionError: expected [Function] to throw an error
AssertionError: expected 2 to be 3
```

GREEN:

```text
$ (cd pipeline && ./node_modules/.bin/vitest run files)
Test Files  1 passed (1)
Tests  11 passed (11)
Duration  94ms
```

Implemented `parseRegistry` type validation and v3-only listings parsing/defaults.

## Task 3 - normalizers copy companyType

RED:

```text
$ (cd pipeline && ./node_modules/.bin/vitest run normalize)
tests/normalize.test.ts (23 tests | 1 failed)
× copies the registry companyType onto every posting
AssertionError: expected false to be true
```

GREEN:

```text
$ (cd pipeline && ./node_modules/.bin/vitest run normalize)
Test Files  1 passed (1)
Tests  23 passed (23)
Duration  108ms
```

Implemented `companyType: company.type` in the six existing normalizers.

## Task 4 - merge carries and compares companyType

RED:

```text
$ (cd pipeline && ./node_modules/.bin/vitest run merge)
tests/merge.test.ts (15 tests | 2 failed)
× carries companyType from posting onto the listing
× bumps dateUpdated when companyType changes
AssertionError: expected undefined to be 'agency'
AssertionError: expected undefined to be 'direct'
```

GREEN:

```text
$ (cd pipeline && ./node_modules/.bin/vitest run merge)
Test Files  1 passed (1)
Tests  15 passed (15)
Duration  118ms
```

Implemented `companyType` in `buildListing` and added it to `COMPARED_FIELDS`.

## Task 5 - registry company types

Pre-write mapping check against actual company names:

```text
$ node --input-type=module <mapping-check>
missing none
total 101 agency 50 direct 51
```

The `tsx` CLI hit a sandbox IPC permission error:

```text
$ (cd pipeline && ./node_modules/.bin/tsx -e "<parse/count command>")
Error: listen EPERM: operation not permitted /var/folders/.../T/tsx-501/...pipe
```

The same check passed via Node's `tsx` import loader:

```text
$ (cd pipeline && node --import tsx -e "<parse/count command>")
total 101 agency 50 direct 51
```

Flip spot-check:

```text
SupportYourApp agency
Hello Rache agency
Xillium agency
Tech Firefly agency
Arcanys agency
Welo Global direct
Callbox agency
```

The data diff was exactly:

```text
$ git diff --numstat -- pipeline/companies.json
101	0	pipeline/companies.json
```

## Self-review notes

- The Task 5 classification conflict was resolved by treating `global-constraints.md` as binding: SupportYourApp, Hello Rache, Xillium, Tech Firefly, and Arcanys were flipped to `agency`; Welo Global stayed `direct`; Callbox stayed `agency`. Final split verified as total 101, agency 50, direct 51.
- Scope stayed within the allowed files for the five tasks plus this report. I did not modify `cli.ts`, `verify-registry.ts`, `backfill.ts`, fetcher files, `data/listings.json`, `README.md`, or `web/`.
- No push was performed and the branch was not switched.
- `.pnpm-store/` remained untracked and unstaged.
- The only concern is environmental: exact pnpm invocations could not run because pnpm attempted a network fetch for `@pnpm/exe`. Local installed binaries were used for equivalent TypeScript, Vitest, and tsx verification, with the pnpm failure captured above.
