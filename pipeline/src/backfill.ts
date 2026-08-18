import { categorize } from "./categorize.js";
import { deriveMetro } from "./metro.js";
import type { Listing, ListingsFile, Registry } from "./types.js";

// Core of `pnpm --filter pipeline recategorize` (SPEC §9): re-runs categorization,
// metro derivation, and the registry metadata copy over the ENTIRE dataset —
// including inactive listings — and the designated v2→v3 migration path.
//
// Re-tagging is our metadata, not a change in the listing itself: datePosted is
// preserved, dateUpdated is never bumped, and the file-level updatedAt stays put
// (recategorize is not a pipeline run).

export interface BackfillSummary {
  total: number;
  levelChanged: number;
  functionChanged: number;
  metroChanged: number;
  industryChanged: number;
  /** Companies present in listings but missing from the registry (industry left ""). */
  unknownCompanies: string[];
}

export interface BackfillResult {
  file: ListingsFile;
  summary: BackfillSummary;
}

export function recategorizeDataset(raw: unknown, registry: Registry): BackfillResult {
  const obj = raw as { version?: unknown; updatedAt?: unknown; listings?: unknown };
  if (obj?.version !== 2 && obj?.version !== 3) {
    throw new Error("recategorize: unsupported listings version (expected 2 or 3)");
  }
  if (typeof obj.updatedAt !== "string") {
    throw new Error("recategorize: missing updatedAt");
  }
  if (!Array.isArray(obj.listings)) {
    throw new Error("recategorize: listings must be an array");
  }

  const industryByCompany = new Map(registry.companies.map((c) => [c.name, c.industry]));
  const typeByCompany = new Map(registry.companies.map((c) => [c.name, c.type]));

  const summary: BackfillSummary = {
    total: obj.listings.length,
    levelChanged: 0,
    functionChanged: 0,
    metroChanged: 0,
    industryChanged: 0,
    unknownCompanies: [],
  };
  const unknown = new Set<string>();

  const listings = (obj.listings as Listing[]).map((old) => {
    const { level, function: fn } = categorize(old.title);
    const metro = deriveMetro(old.locations);
    const industry = industryByCompany.get(old.company) ?? "";
    const companyType = typeByCompany.get(old.company) ?? "direct";
    if (!industryByCompany.has(old.company)) unknown.add(old.company);

    if (level !== old.level) summary.levelChanged += 1;
    if (fn !== old.function) summary.functionChanged += 1;
    if (JSON.stringify(metro) !== JSON.stringify(old.metro ?? null)) summary.metroChanged += 1;
    if (industry !== (old.industry ?? null)) summary.industryChanged += 1;

    // Rebuild in canonical key order so v1 rows gain industry/metro in the same
    // position as pipeline-written v2 rows (keeps the git diff reviewable).
    return {
      id: old.id,
      company: old.company,
      title: old.title,
      locations: old.locations,
      workSetup: old.workSetup,
      level,
      function: fn,
      industry,
      companyType,
      metro,
      url: old.url,
      source: old.source,
      employmentType: old.employmentType,
      salary: old.salary,
      datePosted: old.datePosted,
      dateUpdated: old.dateUpdated,
      active: old.active,
    } satisfies Listing;
  });

  summary.unknownCompanies = [...unknown].sort();
  return {
    file: { version: 3, updatedAt: obj.updatedAt, listings },
    summary,
  };
}
