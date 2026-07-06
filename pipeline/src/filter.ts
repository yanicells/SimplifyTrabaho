import type { FetchedPosting } from "./types.js";

/**
 * PH location keywords (SPEC §8). Single source of truth — extend here when the
 * rejected-locations log surfaces misses. All terms are matched case-insensitively
 * on word boundaries (so bare "ph" never matches inside "Memphis"/"Phoenix").
 */
export const PH_LOCATION_KEYWORDS: readonly string[] = [
  // country
  "philippines",
  "pilipinas",
  "ph",
  // metro & city names
  "ncr",
  "national capital region",
  "manila",
  "makati",
  "taguig",
  "bgc",
  "bonifacio global city",
  "quezon city",
  "pasig",
  "ortigas",
  "mandaluyong",
  "pasay",
  "parañaque",
  "paranaque",
  "alabang",
  "muntinlupa",
  "cebu",
  "davao",
  "iloilo",
  "bacolod",
  "baguio",
  "clark",
  "pampanga",
  "laguna",
  "santa rosa",
  "cavite",
  "batangas",
  "cagayan de oro",
];

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Unicode-aware word boundaries instead of \b: JS \b treats accented letters as
// non-word chars, so the "ph" in Vietnamese "Thành phố" would otherwise match the
// bare-PH country token (real bug, caught 2026-06-11 via Bosch Vietnam listings).
const PH_PATTERN = new RegExp(
  `(?<![\\p{L}\\p{N}])(?:${PH_LOCATION_KEYWORDS.map(escapeRegExp).join("|")})(?![\\p{L}\\p{N}])`,
  "iu",
);

/** True iff the location string ties the role to the Philippines (SPEC §8). */
export function isPhilippineLocation(location: string): boolean {
  return PH_PATTERN.test(location);
}

export interface PhFilterResult {
  kept: FetchedPosting[];
  /** Unique location strings from fully-rejected postings — logged so missing keywords get noticed. */
  rejectedLocations: string[];
}

/** Keep postings where at least one location matches; report what was rejected. */
export function filterPhilippines(postings: FetchedPosting[]): PhFilterResult {
  const kept: FetchedPosting[] = [];
  const rejected = new Set<string>();
  for (const posting of postings) {
    if (posting.locations.some(isPhilippineLocation)) {
      kept.push(posting);
    } else {
      for (const location of posting.locations) rejected.add(location);
    }
  }
  return { kept, rejectedLocations: [...rejected] };
}
