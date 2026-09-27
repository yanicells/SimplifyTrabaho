// Keyword landing pages (/internships, /remote-jobs, /jobs-in-cebu, …). Each is
// the same board opened on a fixed filter, with its own title, description, and intro
// written for how people in the Philippines actually search ("OJT Philippines",
// "work from home jobs", "fresh grad jobs Manila"). The filter is the page's
// substance: every listing shown is a real opening matching the heading.

import { defaultFilters, type Filters } from "./filter-params";
import { filterJobs } from "./filter-jobs";
import type { Job } from "./listings";

export interface Landing {
  slug: string;
  /** Short label for the breadcrumb JSON-LD ("Internships"). */
  label: string;
  /** <title> — the template appends "— SimplifyTrabaho". `{year}` is filled in. */
  title: string;
  h1: string;
  /** Meta description. `{count}` and `{companies}` are filled in at build. */
  description: string;
  /** Visible intro under the H1. Same placeholders as `description`. */
  intro: string;
  filters: Partial<Filters>;
}

/** Below this many live openings a page is too thin to deserve indexing. */
export const MIN_LANDING_JOBS = 20;

function metro(slug: string, label: string, tag: Filters["metro"], places: string): Landing {
  return {
    slug,
    label: `Jobs in ${label}`,
    title: `Jobs in ${label}, Philippines ({year})`,
    h1: `Jobs in ${label}`,
    description: `{count} job openings in ${label} (${places}) from {companies} companies hiring now. Internships, entry-level, and experienced roles, checked daily with official apply links.`,
    intro: `{count} open roles at {companies} companies hiring in ${label} — ${places}. Pulled daily from each company's official careers page, so every Apply button goes straight to the employer.`,
    filters: { metro: tag },
  };
}

function field(slug: string, label: string, fns: Filters["fns"], roles: string): Landing {
  return {
    slug,
    label: `${label} jobs`,
    title: `${label} jobs in the Philippines ({year})`,
    h1: `${label} jobs in the Philippines`,
    description: `{count} ${label.toLowerCase()} jobs in the Philippines — ${roles}. Internships, entry-level, and senior roles from {companies} companies, updated daily.`,
    intro: `{count} ${label.toLowerCase()} openings at {companies} companies in the Philippines: ${roles}. Filter by level, city, or remote, then apply on the company's own site.`,
    filters: { fns },
  };
}

export const LANDINGS: Landing[] = [
  {
    slug: "internships",
    label: "Internships",
    title: "Internships & OJT in the Philippines ({year})",
    h1: "Internships & OJT in the Philippines",
    description:
      "{count} internship and OJT openings at {companies} Philippine companies — paid internships, IT and business internships, remote and on-site. Checked daily, official apply links.",
    intro:
      "{count} internship openings at {companies} companies hiring students in the Philippines, including OJT, paid internships, and summer programs. Each one links to the company's official application page.",
    filters: { levels: ["internship"] },
  },
  {
    slug: "entry-level-jobs",
    label: "Entry-level jobs",
    title: "Entry-level & fresh graduate jobs in the Philippines ({year})",
    h1: "Entry-level & fresh graduate jobs in the Philippines",
    description:
      "{count} entry-level jobs for fresh graduates in the Philippines at {companies} companies — no experience needed for many. Updated daily with official apply links.",
    intro:
      "{count} entry-level openings at {companies} companies hiring fresh graduates and first-time job seekers in the Philippines. Many need little or no work experience. Filter by field, city, or remote.",
    filters: { levels: ["entry"] },
  },
  {
    slug: "remote-jobs",
    label: "Remote jobs",
    title: "Remote & work from home jobs in the Philippines ({year})",
    h1: "Remote & work from home jobs in the Philippines",
    description:
      "{count} remote and work from home (WFH) jobs open to people in the Philippines, from {companies} companies. Entry-level to senior roles, checked daily with official apply links.",
    intro:
      "{count} remote and work from home openings at {companies} companies hiring in the Philippines. Only roles the company itself marks as remote are listed here, not hybrid ones.",
    filters: { setup: "remote" },
  },
  {
    slug: "hybrid-jobs",
    label: "Hybrid jobs",
    title: "Hybrid jobs in the Philippines ({year})",
    h1: "Hybrid jobs in the Philippines",
    description:
      "{count} hybrid jobs in the Philippines from {companies} companies: part work from home, part in the office. Updated daily with official apply links.",
    intro:
      "{count} hybrid openings at {companies} companies — a mix of work from home and office days. The listing's location tells you which office you'd report to.",
    filters: { setup: "hybrid" },
  },
  metro(
    "jobs-in-metro-manila",
    "Metro Manila",
    "ncr",
    "Makati, BGC Taguig, Ortigas, Pasig, Quezon City, Manila, Mandaluyong, Alabang",
  ),
  metro(
    "jobs-in-cebu",
    "Cebu",
    "cebu",
    "Cebu City, Mandaue, Lapu-Lapu, Cebu IT Park, Cebu Business Park",
  ),
  metro("jobs-in-davao", "Davao", "davao", "Davao City and nearby Davao Region"),
  metro(
    "jobs-in-clark-pampanga",
    "Clark & Pampanga",
    "clark-pampanga",
    "Clark Freeport, Angeles City, San Fernando, and the rest of Pampanga",
  ),
  metro(
    "jobs-in-calabarzon",
    "Calabarzon",
    "calabarzon",
    "Laguna, Cavite, Batangas, Rizal, and Quezon province, including Santa Rosa, Calamba, and Lipa",
  ),
  metro("jobs-in-iloilo", "Iloilo", "iloilo", "Iloilo City and Iloilo Business Park"),
  metro(
    "jobs-in-cagayan-de-oro",
    "Cagayan de Oro",
    "cdo",
    "Cagayan de Oro City and Northern Mindanao",
  ),
  metro("jobs-in-bacolod", "Bacolod", "bacolod", "Bacolod City and Negros Occidental"),
  metro("jobs-in-baguio", "Baguio", "baguio", "Baguio City and Benguet"),
  field(
    "it-jobs",
    "IT & software",
    ["engineering"],
    "software developer, web developer, programmer, QA, DevOps, IT support, and systems engineer roles",
  ),
  field(
    "data-jobs",
    "Data & AI",
    ["data"],
    "data analyst, data scientist, data engineer, BI, and machine learning roles",
  ),
  field(
    "customer-service-jobs",
    "Customer service",
    ["customer-support"],
    "customer service representative (CSR), call center, BPO, technical support, and client success roles",
  ),
  field(
    "accounting-finance-jobs",
    "Accounting & finance",
    ["finance"],
    "accountant, bookkeeper, auditor, financial analyst, payroll, and banking roles",
  ),
  field(
    "sales-jobs",
    "Sales",
    ["sales"],
    "sales associate, account executive, business development, and account manager roles",
  ),
  field(
    "marketing-jobs",
    "Marketing",
    ["marketing"],
    "digital marketing, social media, content, SEO, brand, and communications roles",
  ),
  field(
    "hr-jobs",
    "HR",
    ["hr"],
    "HR assistant, recruiter, talent acquisition, and people operations roles",
  ),
  field(
    "healthcare-jobs",
    "Healthcare & nursing",
    ["healthcare"],
    "nurse, medical staff, pharmacist, and healthcare support roles",
  ),
  field(
    "design-jobs",
    "Design",
    ["design"],
    "graphic designer, UI/UX designer, product designer, and creative roles",
  ),
  field(
    "operations-admin-jobs",
    "Operations & admin",
    ["operations"],
    "admin assistant, operations associate, logistics, supply chain, and office staff roles",
  ),
];

/** The board's full filter state for a landing page. */
export function landingFilters(landing: Landing): Filters {
  return { ...defaultFilters(), ...landing.filters };
}

export interface LandingStats {
  jobs: Job[];
  count: number;
  companies: number;
}

export function landingStats(landing: Landing, allJobs: Job[]): LandingStats {
  const { filtered } = filterJobs(allJobs, [], landingFilters(landing));
  return {
    jobs: filtered,
    count: filtered.length,
    companies: new Set(filtered.map((j) => j.company)).size,
  };
}

/** Landing pages with enough live openings to be worth a URL (and a sitemap entry). */
export function publishedLandings(allJobs: Job[]): Landing[] {
  return LANDINGS.filter((l) => landingStats(l, allJobs).count >= MIN_LANDING_JOBS);
}

/** Fills `{count}`, `{companies}`, and `{year}` placeholders. */
export function fillTemplate(
  text: string,
  stats: { count: number; companies: number },
  updatedAt: string,
): string {
  return text
    .replaceAll("{count}", stats.count.toLocaleString("en-US"))
    .replaceAll("{companies}", stats.companies.toLocaleString("en-US"))
    .replaceAll("{year}", updatedAt.slice(0, 4));
}
