import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { fetchAshby } from "./fetchers/ashby.js";
import { fetchGreenhouse } from "./fetchers/greenhouse.js";
import { fetchLever } from "./fetchers/lever.js";
import { fetchRecruitee } from "./fetchers/recruitee.js";
import { fetchSmartRecruiters } from "./fetchers/smartrecruiters.js";
import { fetchWorkable } from "./fetchers/workable.js";
import { emptyListingsFile, parseListingsFile, parseRegistry } from "./files.js";
import { filterPhilippines } from "./filter.js";
import { buildListing, mergeListings } from "./merge.js";
import { generateReadme } from "./readme.js";
import type { FetchedPosting, FetchResult, RegistryCompany } from "./types.js";

// Orchestrator for `pnpm refresh` (SPEC §10): fetch verified companies sequentially
// (the polite HTTP layer enforces ≥1s gaps), PH-filter, categorize, merge into
// data/listings.json, regenerate README.md, print a run summary.

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const REGISTRY_PATH = join(ROOT, "pipeline", "companies.json");
const DATA_DIR = join(ROOT, "data");
const LISTINGS_PATH = join(DATA_DIR, "listings.json");
const FETCH_STATE_PATH = join(DATA_DIR, "fetch-state.json");
const README_PATH = join(ROOT, "README.md");

const DEAD_SLUG_ALERT_AFTER = 3;

type Fetcher = (company: RegistryCompany) => Promise<FetchResult>;

const FETCHERS: Record<RegistryCompany["ats"], Fetcher> = {
  greenhouse: fetchGreenhouse,
  lever: fetchLever,
  ashby: fetchAshby,
  workable: fetchWorkable,
  smartrecruiters: fetchSmartRecruiters,
  recruitee: fetchRecruitee,
};

interface FetchState {
  version: 1;
  /** consecutive dead-slug counts keyed by "ats:slug" */
  deadSlugStreaks: Record<string, number>;
}

function loadFetchState(): FetchState {
  if (!existsSync(FETCH_STATE_PATH)) return { version: 1, deadSlugStreaks: {} };
  return JSON.parse(readFileSync(FETCH_STATE_PATH, "utf8")) as FetchState;
}

async function main(): Promise<number> {
  const now = new Date().toISOString();
  const registry = parseRegistry(JSON.parse(readFileSync(REGISTRY_PATH, "utf8")));
  const verified = registry.companies.filter((c) => c.verified);
  const existing = existsSync(LISTINGS_PATH)
    ? parseListingsFile(JSON.parse(readFileSync(LISTINGS_PATH, "utf8")))
    : emptyListingsFile(now);
  const fetchState = loadFetchState();

  console.log(`simplifytrabaho refresh — ${now}`);
  console.log(`registry: ${registry.companies.length} companies, ${verified.length} verified\n`);

  const allPostings: FetchedPosting[] = [];
  const okByName = new Map<string, boolean>();
  let succeeded = 0;
  let failed = 0;

  for (const company of verified) {
    const fetcher = FETCHERS[company.ats];
    const label = `${company.name} [${company.ats}:${company.slug}]`;
    if (!fetcher) {
      console.log(`  SKIP  ${label} — no fetcher for ${company.ats} yet`);
      okByName.set(company.name, false);
      failed += 1;
      continue;
    }
    const result = await fetcher(company);
    const stateKey = `${company.ats}:${company.slug}`;
    if (result.ok) {
      console.log(`  OK    ${label} — ${result.postings.length} postings`);
      allPostings.push(...result.postings);
      okByName.set(company.name, (okByName.get(company.name) ?? true) && true);
      delete fetchState.deadSlugStreaks[stateKey];
      succeeded += 1;
    } else {
      console.log(`  FAIL  ${label} — ${result.errorKind}: ${result.detail}`);
      okByName.set(company.name, false);
      failed += 1;
      if (result.errorKind === "dead-slug") {
        const streak = (fetchState.deadSlugStreaks[stateKey] ?? 0) + 1;
        fetchState.deadSlugStreaks[stateKey] = streak;
        if (streak >= DEAD_SLUG_ALERT_AFTER) {
          console.log(
            `  TRACKER-ISSUE: ${label} dead-slug ${streak} runs in a row — ` +
              `verify the slug or mark verified:false (SPEC §10.5)`,
          );
        }
      }
    }
  }

  if (succeeded === 0) {
    console.error("\nAll fetches failed — refusing to touch data. Run failed loudly.");
    return 1;
  }

  const { kept, rejectedLocations } = filterPhilippines(allPostings);
  console.log(`\nPH filter: kept ${kept.length} of ${allPostings.length} postings`);
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
    now,
  });

  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(
    LISTINGS_PATH,
    JSON.stringify({ version: 1, updatedAt: now, listings }, null, 2) + "\n",
  );
  writeFileSync(FETCH_STATE_PATH, JSON.stringify(fetchState, null, 2) + "\n");

  const companiesTracked = new Set(verified.map((c) => c.name)).size;
  writeFileSync(README_PATH, generateReadme({ listings, companiesTracked, updatedAt: now }));

  console.log(
    `\nrun summary: ${succeeded} fetched, ${failed} failed · ` +
      `+${summary.added} added, ~${summary.updated} updated, ` +
      `${summary.unchanged} unchanged, -${summary.deactivated} deactivated · ` +
      `${listings.length} total listings (${listings.filter((l) => l.active).length} active)`,
  );
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
