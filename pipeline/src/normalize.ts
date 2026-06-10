import type {
  EmploymentType,
  FetchedPosting,
  RegistryCompany,
  WorkSetup,
} from "./types.js";

// Raw ATS payload → FetchedPosting. Only the whitelisted fact fields below are ever
// read — job-description text, compliance blobs, and anything resembling personal
// data never leave this module (SPEC §3.3/§3.6).

function toIsoUtc(value: string | number | null | undefined): string | null {
  if (value === null || value === undefined || value === "") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/** Keyword fallback for ATSs without a structured remote/hybrid field. */
function workSetupFromText(text: string): WorkSetup {
  if (/\bremote\b/i.test(text)) return "remote";
  if (/\bhybrid\b/i.test(text)) return "hybrid";
  if (/\bon-?site\b/i.test(text)) return "onsite";
  return "unknown";
}

interface GreenhouseJob {
  title?: unknown;
  absolute_url?: unknown;
  location?: { name?: unknown };
  first_published?: unknown;
}

export function normalizeGreenhouse(
  company: RegistryCompany,
  raw: unknown,
): FetchedPosting[] {
  const jobs = (raw as { jobs?: unknown })?.jobs;
  if (!Array.isArray(jobs)) {
    throw new Error(`greenhouse payload for ${company.slug} has no jobs array`);
  }
  return jobs.map((job: GreenhouseJob) => {
    const title = String(job.title ?? "");
    const locationName = String(job.location?.name ?? "");
    const locations = locationName
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean);
    return {
      company: company.name,
      source: "greenhouse",
      title,
      locations,
      url: String(job.absolute_url ?? ""),
      workSetup: workSetupFromText(`${title} ${locationName}`),
      employmentType: "unknown",
      salary: null,
      publishedAt: toIsoUtc(job.first_published as string | null | undefined),
    } satisfies FetchedPosting;
  });
}

function mapLeverWorkplace(value: unknown): WorkSetup {
  switch (String(value ?? "").toLowerCase()) {
    case "remote":
      return "remote";
    case "hybrid":
      return "hybrid";
    case "onsite":
    case "on-site":
      return "onsite";
    default:
      return "unknown";
  }
}

function mapCommitment(value: unknown): EmploymentType {
  const commitment = String(value ?? "").toLowerCase();
  if (commitment.includes("intern")) return "internship";
  if (commitment.includes("part")) return "part-time";
  if (commitment.includes("contract")) return "contract";
  if (commitment.includes("full")) return "full-time";
  return "unknown";
}

interface LeverSalaryRange {
  min?: unknown;
  max?: unknown;
  currency?: unknown;
  interval?: unknown;
}

function formatLeverSalary(range: LeverSalaryRange | null | undefined): string | null {
  if (!range || typeof range.min !== "number" || typeof range.max !== "number") {
    return null;
  }
  const interval = String(range.interval ?? "")
    .replace(/-salary$/, "")
    .replace(/-/g, " ");
  const currency = String(range.currency ?? "").trim();
  return [`${range.min}–${range.max}`, currency, interval].filter(Boolean).join(" ");
}

interface LeverPosting {
  text?: unknown;
  hostedUrl?: unknown;
  createdAt?: unknown;
  workplaceType?: unknown;
  salaryRange?: LeverSalaryRange;
  categories?: { location?: unknown; commitment?: unknown; allLocations?: unknown };
}

export function normalizeLever(company: RegistryCompany, raw: unknown): FetchedPosting[] {
  if (!Array.isArray(raw)) {
    throw new Error(`lever payload for ${company.slug} is not a postings array`);
  }
  return raw.map((posting: LeverPosting) => {
    const categories = posting.categories ?? {};
    const all = Array.isArray(categories.allLocations)
      ? categories.allLocations.map(String)
      : [];
    const locations = all.length > 0 ? all : [String(categories.location ?? "")].filter(Boolean);
    return {
      company: company.name,
      source: "lever",
      title: String(posting.text ?? ""),
      locations,
      url: String(posting.hostedUrl ?? ""),
      workSetup: mapLeverWorkplace(posting.workplaceType),
      employmentType: mapCommitment(categories.commitment),
      salary: formatLeverSalary(posting.salaryRange),
      publishedAt: toIsoUtc(posting.createdAt as number | null | undefined),
    } satisfies FetchedPosting;
  });
}
