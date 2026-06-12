import { isPhilippineLocation } from "./filter.js";
import { METRO_TAGS, type MetroTag } from "./types.js";

// Metro/region tags derived from published location strings (SPEC §6, schema v2).
// Lives beside the PH filter on purpose: same matching rules, same mining workflow.
// Keywords below are mined from real location strings in data/listings.json —
// extend the lists (or the tag list in types.ts, with a SPEC §6 update in the same
// commit) when the data demands it, never speculatively.

export { METRO_TAGS, type MetroTag };

// "manilla" and "tauig" are real misspellings published by company boards.
const METRO_KEYWORDS: ReadonlyArray<readonly [MetroTag, readonly string[]]> = [
  [
    "ncr",
    [
      "ncr",
      "national capital region",
      "metro manila",
      "manila",
      "manilla",
      "makati",
      "taguig",
      "tauig",
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
      "las piñas",
      "las pinas",
      "caloocan",
      "malabon",
      "navotas",
      "valenzuela",
      "marikina",
      "pateros",
      "malate",
      "camanava",
    ],
  ],
  ["cebu", ["cebu", "mandaue", "lapu-lapu", "lapu lapu", "liloan"]],
  ["davao", ["davao"]],
  ["clark-pampanga", ["clark", "pampanga", "angeles"]],
  [
    "calabarzon",
    [
      "calabarzon",
      "laguna",
      "santa rosa",
      "cavite",
      "batangas",
      "lipa",
      "biñan",
      "binan",
      "imus",
      "dasmariñas",
      "dasmarinas",
      "calamba",
      "san pedro",
      "san pablo",
    ],
  ],
  ["iloilo", ["iloilo"]],
  ["bacolod", ["bacolod"]],
  ["baguio", ["baguio"]],
  ["cdo", ["cagayan de oro"]],
] as const;

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Same Unicode lookaround boundaries as the PH filter (JS \b mishandles ñ etc.).
function keywordPattern(keywords: readonly string[]): RegExp {
  return new RegExp(
    `(?<![\\p{L}\\p{N}])(?:${keywords.map(escapeRegExp).join("|")})(?![\\p{L}\\p{N}])`,
    "iu",
  );
}

const METRO_PATTERNS: ReadonlyArray<readonly [MetroTag, RegExp]> = METRO_KEYWORDS.map(
  ([tag, keywords]) => [tag, keywordPattern(keywords)] as const,
);

const REMOTE_PATTERN = /\bremote\b/i;

const TAG_ORDER = new Map(METRO_TAGS.map((tag, index) => [tag, index]));

/**
 * Union of metro tags across a listing's locations (SPEC §6). Non-PH locations
 * contribute nothing; PH locations with no metro bucket fall back to `other-ph`.
 * A remote PH location also keeps its city tag when it names one.
 */
export function deriveMetro(locations: string[]): MetroTag[] {
  const tags = new Set<MetroTag>();
  for (const location of locations) {
    if (!isPhilippineLocation(location)) continue;
    let matched = false;
    for (const [tag, pattern] of METRO_PATTERNS) {
      if (pattern.test(location)) {
        tags.add(tag);
        matched = true;
      }
    }
    if (REMOTE_PATTERN.test(location)) {
      tags.add("remote-ph");
      matched = true;
    }
    if (!matched) tags.add("other-ph");
  }
  return [...tags].sort((a, b) => (TAG_ORDER.get(a) ?? 99) - (TAG_ORDER.get(b) ?? 99));
}
