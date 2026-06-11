import { ATS_SOURCES, type Listing, type ListingsFile, type Registry, type RegistryCompany } from "./types.js";

// Parsing/validation for the two data files. Throws with a clear message on any
// structural problem — a corrupt registry or dataset must stop the run, not limp on.

function fail(message: string): never {
  throw new Error(message);
}

export function parseRegistry(raw: unknown): Registry {
  const obj = raw as { version?: unknown; companies?: unknown };
  if (obj?.version !== 1) fail("registry: unsupported version (expected 1)");
  if (!Array.isArray(obj.companies)) fail("registry: companies must be an array");

  const seen = new Set<string>();
  const companies = obj.companies.map((entry: Record<string, unknown>, index: number) => {
    const where = `registry company #${index}`;
    if (typeof entry?.name !== "string" || entry.name === "") fail(`${where}: missing name`);
    if (!ATS_SOURCES.includes(entry.ats as (typeof ATS_SOURCES)[number])) {
      fail(`${where} (${String(entry.name)}): invalid ats "${String(entry.ats)}"`);
    }
    if (typeof entry.slug !== "string" || entry.slug === "") {
      fail(`${where} (${String(entry.name)}): missing slug`);
    }
    if (typeof entry.verified !== "boolean") {
      fail(`${where} (${String(entry.name)}): verified must be boolean`);
    }
    const key = `${String(entry.ats)}:${entry.slug}`;
    if (seen.has(key)) fail(`registry: duplicate ats+slug pair ${key}`);
    seen.add(key);
    const company: RegistryCompany = {
      name: entry.name,
      ats: entry.ats as RegistryCompany["ats"],
      slug: entry.slug,
      industry: typeof entry.industry === "string" ? entry.industry : "",
      verified: entry.verified,
      added: typeof entry.added === "string" ? entry.added : "",
    };
    if (typeof entry.notes === "string" && entry.notes !== "") company.notes = entry.notes;
    return company;
  });

  return { version: 1, companies };
}

/** Merge new registry entries in: existing ats+slug pairs win, output stays alphabetized. */
export function mergeRegistryCompanies(
  existing: RegistryCompany[],
  additions: RegistryCompany[],
): RegistryCompany[] {
  const byKey = new Map(existing.map((c) => [`${c.ats}:${c.slug}`, c]));
  for (const company of additions) {
    const key = `${company.ats}:${company.slug}`;
    if (!byKey.has(key)) byKey.set(key, company);
  }
  return [...byKey.values()].sort(
    (a, b) => a.name.localeCompare(b.name) || a.ats.localeCompare(b.ats),
  );
}

export function emptyListingsFile(updatedAt: string): ListingsFile {
  return { version: 1, updatedAt, listings: [] };
}

export function parseListingsFile(raw: unknown): ListingsFile {
  const obj = raw as { version?: unknown; updatedAt?: unknown; listings?: unknown };
  if (obj?.version !== 1) fail("listings file: unsupported version (expected 1)");
  if (typeof obj.updatedAt !== "string") fail("listings file: missing updatedAt");
  if (!Array.isArray(obj.listings)) fail("listings file: listings must be an array");
  return { version: 1, updatedAt: obj.updatedAt, listings: obj.listings as Listing[] };
}
