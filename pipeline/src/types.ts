// Shared type definitions for the whole repo (SPEC §6–7).
// One Listing definition only — web imports from here at build time.

export const ATS_SOURCES = [
  "greenhouse",
  "lever",
  "ashby",
  "workable",
  "smartrecruiters",
  "recruitee",
  "bamboohr",
  "breezy",
  "manatal",
  "workday",
] as const;
export type AtsSource = (typeof ATS_SOURCES)[number];

/** Schema v2 → v3 (SPEC §7): registry employer type, denormalized onto each Listing. */
export type CompanyType = "direct" | "agency";

export type WorkSetup = "onsite" | "hybrid" | "remote" | "unknown";

export type Level = "internship" | "entry" | "mid" | "senior" | "unknown";

/** Schema v2 (SPEC §6): 18 values aligned with the SEEK/JobStreet classification. */
export type JobFunction =
  | "engineering"
  | "data"
  | "design"
  | "product"
  | "marketing"
  | "sales"
  | "finance"
  | "hr"
  | "operations"
  | "customer-support"
  | "legal"
  | "healthcare"
  | "education"
  | "hospitality"
  | "manufacturing"
  | "retail"
  | "construction"
  | "other";

export type EmploymentType = "full-time" | "part-time" | "contract" | "internship" | "unknown";

/**
 * Schema v2 (SPEC §6): the metro/region tag value list, in canonical order.
 * Extend only as real locations demand, with a SPEC §6 update in the same commit.
 * Lives here (not metro.ts) so the web build can import it without traversing
 * NodeNext `.js` imports its bundler can't resolve.
 */
export const METRO_TAGS = [
  "ncr",
  "cebu",
  "davao",
  "clark-pampanga",
  "calabarzon",
  "iloilo",
  "bacolod",
  "baguio",
  "cdo",
  "remote-ph",
  "other-ph",
] as const;
export type MetroTag = (typeof METRO_TAGS)[number];

/** A job listing — facts only, never description text or personal data (SPEC §3). */
export interface Listing {
  /** First 12 hex chars of SHA-256 of the application URL. Stable across runs. */
  id: string;
  /** Display name from the registry, not the ATS payload. */
  company: string;
  /** Role title verbatim as published. */
  title: string;
  /** Raw location strings as published. */
  locations: string[];
  workSetup: WorkSetup;
  level: Level;
  function: JobFunction;
  /** Schema v2: company-level industry tag copied from the registry at normalization. */
  industry: string;
  /** Schema v3: registry employer type copied at normalization (SPEC §7/§11). */
  companyType: CompanyType;
  /** Schema v2: normalized PH region tags derived from `locations` (SPEC §6). */
  metro: string[];
  /** Official application URL on the company's ATS — the only outbound link. */
  url: string;
  source: AtsSource;
  employmentType: EmploymentType;
  /** Verbatim formatted range, only when published in the structured feed. Never inferred. */
  salary: string | null;
  /** ISO 8601 UTC. ATS published/created date, else first seen. Never changes once set. */
  datePosted: string;
  /** ISO 8601 UTC. Last time the listing changed (incl. active flag flips). */
  dateUpdated: string;
  /** False once the listing disappears from the feed. Inactive listings are kept forever. */
  active: boolean;
}

export interface ListingsFile {
  version: 3;
  /** ISO 8601 UTC of the last successful pipeline run. */
  updatedAt: string;
  listings: Listing[];
}

/** One entry in pipeline/companies.json (SPEC §7). */
export interface RegistryCompany {
  name: string;
  ats: AtsSource;
  slug: string;
  industry: string;
  /** Schema v3 (SPEC §7): "agency" = staffing/outsourcing/recruitment; else "direct". */
  type: CompanyType;
  /** Only verified entries are fetched; false = candidate pending verification. */
  verified: boolean;
  /** Permanently excluded from fetching after a block/removal review; retained for provenance. */
  disabled?: boolean;
  /** ISO date the entry was added. */
  added: string;
  notes?: string;
}

export interface Registry {
  version: 1;
  companies: RegistryCompany[];
}

/**
 * A normalized posting straight out of an ATS fetcher: everything a Listing needs
 * except id/level/function and the merge-managed lifecycle fields.
 */
export interface FetchedPosting {
  company: string;
  source: AtsSource;
  title: string;
  locations: string[];
  url: string;
  workSetup: WorkSetup;
  employmentType: EmploymentType;
  salary: string | null;
  /** ISO 8601 UTC when the ATS publishes a created/published date, else null. */
  publishedAt: string | null;
  /** Schema v2: the registry entry's industry tag, copied at normalization. */
  industry: string;
  /** Schema v3: the registry entry's employer type, copied at normalization. */
  companyType: CompanyType;
}

/** "blocked" is Workday-only (SPEC §17.1.2): permanent stop, human review required. */
export type FetchErrorKind = "dead-slug" | "http" | "network" | "blocked";

export type FetchResult =
  | { ok: true; postings: FetchedPosting[] }
  | { ok: false; errorKind: FetchErrorKind; detail: string };
