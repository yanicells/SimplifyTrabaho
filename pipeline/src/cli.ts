import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { groupByHost } from "./fetchers/http.js";
import { createRunFetcher } from "./fetchers/index.js";
import { computeCoverage, formatCoverageReport } from "./coverage.js";
import { loadFetchState, recordBlock, saveFetchState } from "./fetch-state.js";
import { emptyListingsFile, parseListingsFile, parseRegistry } from "./files.js";
import { filterPhilippines } from "./filter.js";
import { buildListing, mergeListings } from "./merge.js";
import { generateReadme } from "./readme.js";
import type { FetchedPosting, RegistryCompany } from "./types.js";

// Orchestrator for `pnpm refresh` (SPEC §10): fetch verified companies — sequentially
// per host, hosts in parallel (the polite HTTP layer enforces ≥1s gaps) — PH-filter,
// categorize, merge into data/listings.json, regenerate README.md, print a run summary.

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const REGISTRY_PATH = join(ROOT, "pipeline", "companies.json");
const DATA_DIR = join(ROOT, "data");
const LISTINGS_PATH = join(DATA_DIR, "listings.json");
const FETCH_STATE_PATH = join(DATA_DIR, "fetch-state.json");
const README_PATH = join(ROOT, "README.md");

const DEAD_SLUG_ALERT_AFTER = 3;

async function main(): Promise<number> {
  const now = new Date().toISOString();
  const registry = parseRegistry(JSON.parse(readFileSync(REGISTRY_PATH, "utf8")));
  const verified = registry.companies.filter((c) => c.verified);
  const enabled = verified.filter((c) => !c.disabled);
  const enabledCompanyNames = new Set(enabled.map((c) => c.name));
  const existing = existsSync(LISTINGS_PATH)
    ? parseListingsFile(JSON.parse(readFileSync(LISTINGS_PATH, "utf8")))
    : emptyListingsFile(now);
  // A company with no enabled board (disabled after review, retired as
  // verified:false, or dropped from the registry) is never fetched again, so its
  // listings can never be confirmed live — retire them.
  const inactiveCompanies = new Set(
    existing.listings.map((l) => l.company).filter((name) => !enabledCompanyNames.has(name)),
  );
  const fetchState = loadFetchState(FETCH_STATE_PATH);

  console.log(`SimplifyTrabaho refresh — ${now}`);
  console.log(
    `registry: ${registry.companies.length} boards, ${verified.length} verified, ` +
      `${enabled.length} enabled\n`,
  );

  const allPostings: FetchedPosting[] = [];
  const okByName = new Map<string, boolean>();
  const zeroPhBoards: string[] = [];
  let succeeded = 0;
  let failed = 0;
  // Stops all Workday requests for the rest of the run after the first block.
  const fetchBoard = createRunFetcher();

  // Fetches one board; all of its log lines go through `log` so they print as one block.
  const fetchOne = async (company: RegistryCompany, log: (line: string) => void) => {
    const label = `${company.name} [${company.ats}:${company.slug}]`;
    const stateKey = `${company.ats}:${company.slug}`;
    const blockNote = fetchState.blocked?.[stateKey];
    if (blockNote !== undefined) {
      // §17.1.2: a blocked tenant stays skipped until a human reviews and
      // removes the entry from data/fetch-state.json.
      log(`  SKIP  ${label} — BLOCKED (${blockNote}) — human review required`);
      okByName.set(company.name, false);
      failed += 1;
      return;
    }
    const result = await fetchBoard(company);
    if (result === null) {
      log(`  SKIP  ${label} — Workday halted for this run after a block`);
      okByName.set(company.name, false);
      failed += 1;
      return;
    }
    if (result.ok) {
      const cap = result.partial ? " (partial: stopped at pagination cap)" : "";
      log(`  OK    ${label} — ${result.postings.length} postings${cap}`);
      allPostings.push(...result.postings);
      if (filterPhilippines(result.postings).kept.length === 0) zeroPhBoards.push(label);
      // Keep an earlier board's failure sticky for multi-board companies. A partial
      // fetch counts as not-fully-fetched: its listings upsert, nothing deactivates.
      okByName.set(company.name, !result.partial && (okByName.get(company.name) ?? true));
      delete fetchState.deadSlugStreaks[stateKey];
      succeeded += 1;
    } else {
      log(`  FAIL  ${label} — ${result.errorKind}: ${result.detail}`);
      okByName.set(company.name, false);
      failed += 1;
      if (result.errorKind === "blocked") {
        recordBlock(
          FETCH_STATE_PATH,
          fetchState,
          stateKey,
          `${now.slice(0, 10)}: ${result.detail}`,
        );
        log(
          `  TRACKER-ISSUE: ${label} BLOCKED — recorded in fetch-state.json; ` +
            `mark the company blocked in TRACKER and do not retry (SPEC §17.1.2)`,
        );
      }
      if (result.errorKind === "dead-slug") {
        const streak = (fetchState.deadSlugStreaks[stateKey] ?? 0) + 1;
        fetchState.deadSlugStreaks[stateKey] = streak;
        if (streak >= DEAD_SLUG_ALERT_AFTER) {
          log(
            `  TRACKER-ISSUE: ${label} dead-slug ${streak} runs in a row — ` +
              `verify the slug or mark verified:false (SPEC §10.5)`,
          );
        }
      }
    }
  };

  // One sequential queue per host, queues in parallel (SPEC §3.5: politeness is per host).
  await Promise.all(
    groupByHost(enabled).map(async (group) => {
      for (const company of group) {
        const lines: string[] = [];
        await fetchOne(company, (line) => lines.push(line));
        console.log(lines.join("\n"));
      }
    }),
  );

  if (succeeded === 0) {
    console.error("\nAll fetches failed — refusing to touch data. Run failed loudly.");
    return 1;
  }

  // A blank title means the source row was malformed (e.g. a Workday board stub) —
  // it can never render or validate, so it must not reach listings.json.
  const titled = allPostings.filter((posting) => posting.title.trim() !== "");
  if (titled.length < allPostings.length) {
    const dropped = allPostings.filter((posting) => posting.title.trim() === "");
    console.warn(`\nDropped ${dropped.length} posting(s) with empty title:`);
    for (const posting of dropped) console.warn(`  - ${posting.company}: ${posting.url}`);
  }

  const { kept, rejectedLocations } = filterPhilippines(titled);
  console.log(`\nPH filter: kept ${kept.length} of ${titled.length} postings`);
  if (rejectedLocations.length > 0) {
    const sample = rejectedLocations.slice(0, 15);
    console.log(`rejected location sample (${rejectedLocations.length} unique):`);
    for (const location of sample) console.log(`  - ${location}`);
  }

  // A company's absence only means something if every one of its boards fetched OK.
  const fetchedCompanies = new Set(
    [...okByName.entries()].filter(([, allOk]) => allOk).map(([name]) => name),
  );

  const current = kept.map((posting) => buildListing(posting, now));
  const { listings, summary } = mergeListings({
    existing: existing.listings,
    current,
    fetchedCompanies,
    inactiveCompanies,
    now,
  });

  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(
    LISTINGS_PATH,
    JSON.stringify({ version: 3, updatedAt: now, listings }, null, 2) + "\n",
  );
  saveFetchState(FETCH_STATE_PATH, fetchState);

  const companiesTracked = enabledCompanyNames.size;
  writeFileSync(README_PATH, generateReadme({ listings, companiesTracked, updatedAt: now }));

  console.log(
    `\nrun summary: ${succeeded} fetched, ${failed} failed · ` +
      `+${summary.added} added, ~${summary.updated} updated, ` +
      `${summary.unchanged} unchanged, -${summary.deactivated} deactivated · ` +
      `${listings.length} total listings (${listings.filter((l) => l.active).length} active)`,
  );
  if (zeroPhBoards.length > 0) {
    // Fetched fine but nothing in PH — often a moved or abandoned board worth a look.
    console.log(`zero-PH boards (${zeroPhBoards.length}): ${zeroPhBoards.sort().join(", ")}`);
  }
  // SPEC §9: coverage in every refresh summary so categorizer drift stays visible.
  console.log("\n" + formatCoverageReport(computeCoverage(listings)));
  console.log(`wrote ${LISTINGS_PATH}`);
  console.log(`wrote ${README_PATH}`);
  return 0;
}

main()
  .then((code) => process.exit(code))
  .catch((error) => {
    console.error("refresh failed:", error);
    process.exit(1);
  });
