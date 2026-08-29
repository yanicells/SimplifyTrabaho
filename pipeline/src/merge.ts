import { createHash } from "node:crypto";
import { categorize } from "./categorize.js";
import { deriveMetro } from "./metro.js";
import type { FetchedPosting, Listing } from "./types.js";

/** First 12 hex chars of SHA-256 of the application URL (SPEC §6) — stable across runs. */
export function listingId(url: string): string {
  return createHash("sha256").update(url).digest("hex").slice(0, 12);
}

/** Assemble a full Listing from a normalized posting. `now` is injected for testability. */
export function buildListing(posting: FetchedPosting, now: string): Listing {
  const { level, function: fn } = categorize(posting.title);
  return {
    id: listingId(posting.url),
    company: posting.company,
    title: posting.title,
    locations: posting.locations,
    workSetup: posting.workSetup,
    level,
    function: fn,
    industry: posting.industry,
    companyType: posting.companyType,
    metro: deriveMetro(posting.locations),
    url: posting.url,
    source: posting.source,
    employmentType: posting.employmentType,
    salary: posting.salary,
    datePosted: posting.publishedAt ?? now,
    dateUpdated: now,
    active: true,
  };
}

export interface MergeInput {
  existing: Listing[];
  current: Listing[];
  /** Company names whose fetch SUCCEEDED this run — only their absences mean anything. */
  fetchedCompanies: Set<string>;
  /** Company names explicitly disabled in the registry after human/maintainer review. */
  inactiveCompanies?: Set<string>;
  now: string;
}

export interface MergeSummary {
  added: number;
  updated: number;
  unchanged: number;
  deactivated: number;
}

export interface MergeResult {
  listings: Listing[];
  summary: MergeSummary;
}

/** Fields whose change bumps dateUpdated. datePosted and the lifecycle fields are excluded. */
const COMPARED_FIELDS = [
  "company",
  "title",
  "locations",
  "workSetup",
  "level",
  "function",
  "industry",
  "companyType",
  "metro",
  "url",
  "source",
  "employmentType",
  "salary",
] as const;

function contentChanged(a: Listing, b: Listing): boolean {
  return COMPARED_FIELDS.some(
    (field) => JSON.stringify(a[field]) !== JSON.stringify(b[field]),
  );
}

/** Merge this run's listings into the existing dataset per SPEC §10. */
export function mergeListings({
  existing,
  current,
  fetchedCompanies,
  inactiveCompanies = new Set(),
  now,
}: MergeInput): MergeResult {
  const summary: MergeSummary = { added: 0, updated: 0, unchanged: 0, deactivated: 0 };
  const currentById = new Map(current.map((listing) => [listing.id, listing]));
  const merged: Listing[] = [];

  for (const old of existing) {
    const incoming = currentById.get(old.id);
    if (incoming) {
      currentById.delete(old.id);
      if (contentChanged(old, incoming) || !old.active) {
        merged.push({
          ...incoming,
          datePosted: old.datePosted, // immutable once set (SPEC §6)
          dateUpdated: now,
          active: true,
        });
        summary.updated += 1;
      } else {
        merged.push(old);
        summary.unchanged += 1;
      }
    } else if (
      old.active &&
      (fetchedCompanies.has(old.company) || inactiveCompanies.has(old.company))
    ) {
      // Present before, then absent from a successful fetch — or deliberately
      // disabled after review — means the listing is no longer publishable.
      merged.push({ ...old, active: false, dateUpdated: now });
      summary.deactivated += 1;
    } else {
      // company fetch failed this run, or listing already inactive → leave untouched
      merged.push(old);
    }
  }

  for (const fresh of currentById.values()) {
    merged.push(fresh);
    summary.added += 1;
  }

  merged.sort(
    (a, b) =>
      a.company.localeCompare(b.company) ||
      b.datePosted.localeCompare(a.datePosted) ||
      a.id.localeCompare(b.id),
  );

  return { listings: merged, summary };
}
