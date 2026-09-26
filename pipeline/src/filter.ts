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
  // Fast Retailing's Philippines store code (UNIQLO locations omit the country).
  "frph",
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
  // Named Philippine island regions/province found in rejected ATS locations.
  "visayas",
  "mindanao",
  "bohol",
];

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Unicode-aware word boundaries instead of \b: JS \b treats accented letters as
// non-word chars, so the "ph" in Vietnamese "Thành phố" would otherwise match the
// bare-PH country token (real bug, caught 2026-06-11 via Bosch Vietnam listings).
function wordPattern(words: readonly string[]): RegExp {
  return new RegExp(
    `(?<![\\p{L}\\p{N}])(?:${words.map(escapeRegExp).join("|")})(?![\\p{L}\\p{N}])`,
    "iu",
  );
}

const PH_PATTERN = wordPattern(PH_LOCATION_KEYWORDS);

// City names shared with the US ("Santa Rosa, CA", "Laguna Hills, CA", "Clark, NJ"):
// a US marker, a ", XX" state code, or a ", State" name vetoes the match unless the
// country is named.
const US_MARKER = /\b(?:united states|usa|u\.s\.a?)(?![\p{L}.])/iu;
const STATE_CODE = /,\s*(?!PH\b|MM\b)[A-Z]{2}(?!\p{L})/u;
// Only as a comma-separated part ("Manila, Arkansas"), so PH place names that
// contain a state ("California Garden Square, Mandaluyong") still pass.
const US_STATE_NAMES = [
  "alabama", "alaska", "arizona", "arkansas", "california", "colorado", "connecticut",
  "delaware", "district of columbia", "florida", "georgia", "hawaii", "idaho",
  "illinois", "indiana", "iowa", "kansas", "kentucky", "louisiana", "maine",
  "maryland", "massachusetts", "michigan", "minnesota", "mississippi", "missouri",
  "montana", "nebraska", "nevada", "new hampshire", "new jersey", "new mexico",
  "new york", "north carolina", "north dakota", "ohio", "oklahoma", "oregon",
  "pennsylvania", "rhode island", "south carolina", "south dakota", "tennessee",
  "texas", "utah", "vermont", "virginia", "washington", "west virginia", "wisconsin",
  "wyoming",
]; // prettier-ignore
const US_STATE = new RegExp(`,\\s*(?:${US_STATE_NAMES.join("|")})\\s*(?:[,(]|$)`, "i");
// Other countries' namesakes of PH keywords: India's and Canada's own National
// Capital Regions ("Gurugram, Delhi NCR", "Ottawa, National Capital Region") and
// the Santa Rosas of Latin America ("Santa Rosa, La Pampa, Argentina"). Global
// Workday tenants list such sites as facet values, and findPhilippinesFacet uses
// this same check to pick them (§17.1.4).
const FOREIGN_MARKER = wordPattern([
  "india",
  "delhi",
  "noida",
  "gurugram",
  "gurgaon",
  "canada",
  "ottawa",
  "argentina",
  "la pampa",
  "mexico",
  "guatemala",
  "honduras",
  "el salvador",
  "bolivia",
  "peru",
  "perú",
  "paraguay",
  "brazil",
  "brasil",
]);
// The country named outright; an uppercase PH token counts ("India & PH (Remote)").
const PH_COUNTRY = /\b(?:philippines|pilipinas)\b/i;
const PH_CODE = /(?<![\p{L}\p{N}])PH(?![\p{L}\p{N}])/u;

/** True iff the location string ties the role to the Philippines (SPEC §8). */
export function isPhilippineLocation(location: string): boolean {
  if (!PH_PATTERN.test(location)) return false;
  if (PH_COUNTRY.test(location) || PH_CODE.test(location)) return true;
  return ![US_MARKER, STATE_CODE, US_STATE, FOREIGN_MARKER].some((veto) =>
    veto.test(location),
  );
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
