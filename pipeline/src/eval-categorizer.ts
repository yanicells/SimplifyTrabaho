import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { computeCoverage, formatCoverageReport } from "./coverage.js";
import type { Listing } from "./types.js";

// `pnpm --filter pipeline eval-categorizer` (SPEC §9): prints coverage and the
// top uncategorized titles. Keyword additions are mined from this output — never
// invented. Reads the listings file leniently (v1 or v2) so it can run pre-migration.

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const LISTINGS_PATH = join(ROOT, "data", "listings.json");

const raw = JSON.parse(readFileSync(LISTINGS_PATH, "utf8")) as {
  version?: unknown;
  listings?: unknown;
};
if (!Array.isArray(raw.listings)) {
  console.error("eval-categorizer: data/listings.json has no listings array");
  process.exit(1);
}

console.log(formatCoverageReport(computeCoverage(raw.listings as Listing[])));
console.log(
  "\ntargets (SPEC §9): level unknown < 25%, function other < 15% — never trade accuracy for coverage.",
);
