import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRunFetcher } from "./fetchers/index.js";
import { mergeRegistryCompanies, parseRegistry } from "./files.js";
import { filterPhilippines } from "./filter.js";
import type { AtsSource, CompanyType, RegistryCompany } from "./types.js";

// Registry verification tool (SPEC §7.1): probes candidate slugs against the twelve
// documented ATS endpoints plus Workday (politely — the HTTP layer enforces 1s gaps), checks for
// PH roles, and merges verified entries into companies.json. Failures are printed
// in TRACKER.md format so they can be logged, not re-researched.
//
// candidates.json format:
//   { "candidates": [ { "name", "industry", "phHq"?: bool,
//                       "tries": [ { "ats", "slug" }, ... ] } ] }
// Rule: verified iff the endpoint is live AND (≥1 posting passes the PH filter, or
// the company is PH-headquartered).

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const REGISTRY_PATH = join(ROOT, "pipeline", "companies.json");
const CANDIDATES_PATH = join(ROOT, "pipeline", "candidates.json");

interface Candidate {
  name: string;
  industry: string;
  type?: CompanyType; // defaults to "direct" — round 3 chases direct employers
  phHq?: boolean;
  tries: Array<{ ats: AtsSource; slug: string }>;
}

async function main(): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  const registry = parseRegistry(JSON.parse(readFileSync(REGISTRY_PATH, "utf8")));
  const known = new Set(registry.companies.map((c) => `${c.ats}:${c.slug}`));
  const { candidates } = JSON.parse(readFileSync(CANDIDATES_PATH, "utf8")) as {
    candidates: Candidate[];
  };

  const additions: RegistryCompany[] = [];
  const failures: string[] = [];
  // Same run-level stop as `pnpm refresh`: no Workday probe after a block (§17.1.2).
  const fetchBoard = createRunFetcher();

  for (const candidate of candidates) {
    const tried: string[] = [];
    let verifiedEntry: RegistryCompany | null = null;
    let liveButNoPH: string | null = null;

    for (const attempt of candidate.tries) {
      const key = `${attempt.ats}:${attempt.slug}`;
      if (known.has(key)) {
        console.log(`  SKIP  ${candidate.name} — ${key} already in registry`);
        verifiedEntry = null;
        tried.length = 0;
        break;
      }
      const probe: RegistryCompany = {
        name: candidate.name,
        ats: attempt.ats,
        slug: attempt.slug,
        industry: candidate.industry,
        type: candidate.type ?? "direct",
        verified: false,
        added: today,
      };
      const result = await fetchBoard(probe);
      if (result === null) {
        console.log(
          `  SKIP  ${candidate.name} — ${key}: Workday halted for this run after a block`,
        );
        continue;
      }
      tried.push(`${attempt.slug} (${attempt.ats})`);
      if (!result.ok) {
        console.log(`  MISS  ${candidate.name} — ${key}: ${result.errorKind}`);
        if (result.errorKind === "blocked") {
          console.log(
            `  BLOCKED  ${key} — ${result.detail}. No more Workday probes this run; ` +
              `do not add or re-probe this tenant (SPEC §17.1.2)`,
          );
        }
        continue;
      }
      const phCount = filterPhilippines(result.postings).kept.length;
      const live = `${key} live, ${result.postings.length} postings, ${phCount} PH`;
      if (phCount > 0 || candidate.phHq === true) {
        const why =
          phCount > 0 ? `${phCount} PH postings` : "PH-headquartered, 0 open PH roles today";
        verifiedEntry = { ...probe, verified: true, notes: `auto-verified ${today}: ${why}` };
        console.log(`  ✅    ${candidate.name} — ${live} → VERIFIED (${why})`);
        if (phCount === 0) {
          // A live slug with zero PH postings might belong to an unrelated company
          // with the same name (it happened: lever:maya was a US firm, not the PH
          // fintech). PH-HQ verification needs a manual identity check.
          console.log(
            `  ⚠     ${candidate.name} — 0 PH postings: CONFIRM the board really belongs to this company before trusting it`,
          );
        }
        break;
      }
      liveButNoPH = live;
      console.log(`  LIVE  ${candidate.name} — ${live} (no PH roles, not PH-HQ)`);
    }

    if (verifiedEntry) {
      additions.push(verifiedEntry);
      known.add(`${verifiedEntry.ats}:${verifiedEntry.slug}`);
    } else if (tried.length > 0) {
      const note = liveButNoPH ? `live but no PH roles (${liveButNoPH})` : "all dead";
      failures.push(
        `- ${candidate.name} — slugs tried: ${tried.join(", ")} — ${today} — ${note}`,
      );
    }
  }

  if (additions.length > 0) {
    const merged = mergeRegistryCompanies(registry.companies, additions);
    writeFileSync(
      REGISTRY_PATH,
      JSON.stringify({ version: 1, companies: merged }, null, 2) + "\n",
    );
    console.log(`\nadded ${additions.length} companies → ${REGISTRY_PATH}`);
  }
  console.log(`\nregistry now has ${registry.companies.length + additions.length} entries`);
  if (failures.length > 0) {
    console.log(`\nTRACKER.md failed-candidate lines:\n${failures.join("\n")}`);
  }
}

main().catch((error) => {
  console.error("verify-registry failed:", error);
  process.exit(1);
});
