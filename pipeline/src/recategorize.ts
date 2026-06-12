import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { recategorizeDataset } from "./backfill.js";
import { parseRegistry } from "./files.js";

// `pnpm --filter pipeline recategorize` (SPEC §9): full-dataset backfill including
// inactive listings, and the v1→v2 migration path. See backfill.ts for the rules.

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const LISTINGS_PATH = join(ROOT, "data", "listings.json");
const REGISTRY_PATH = join(ROOT, "pipeline", "companies.json");

const registry = parseRegistry(JSON.parse(readFileSync(REGISTRY_PATH, "utf8")));
const raw = JSON.parse(readFileSync(LISTINGS_PATH, "utf8")) as { version?: unknown };
const before = raw.version;

const { file, summary } = recategorizeDataset(raw, registry);
writeFileSync(LISTINGS_PATH, JSON.stringify(file, null, 2) + "\n");

console.log(`recategorize: schema v${String(before)} → v2, ${summary.total} listings`);
console.log(
  `  level changed: ${summary.levelChanged} · function changed: ${summary.functionChanged} · ` +
    `metro changed: ${summary.metroChanged} · industry changed: ${summary.industryChanged}`,
);
if (summary.unknownCompanies.length > 0) {
  console.log(
    `  companies missing from registry (industry left blank): ${summary.unknownCompanies.join(", ")}`,
  );
}
console.log(`wrote ${LISTINGS_PATH}`);
