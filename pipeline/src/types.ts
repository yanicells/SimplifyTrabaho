// Shared type definitions for the whole repo (SPEC §6–7).
// One Listing definition only — web imports from here at build time.

export const ATS_SOURCES = [
  "greenhouse",
  "lever",
  "ashby",
  "workable",
  "smartrecruiters",
  "recruitee",
] as const;
export type AtsSource = (typeof ATS_SOURCES)[number];

export type WorkSetup = "onsite" | "hybrid" | "remote" | "unknown";

export type Level = "internship" | "entry" | "mid" | "senior" | "unknown";

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
  | "other";

export type EmploymentType = "full-time" | "part-time" | "contract" | "internship" | "unknown";

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
  version: 1;
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
  /** Only verified entries are fetched; false = candidate pending verification. */
  verified: boolean;
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
}

export type FetchErrorKind = "dead-slug" | "http" | "network";

export type FetchResult =
  | { ok: true; postings: FetchedPosting[] }
  | { ok: false; errorKind: FetchErrorKind; detail: string };
