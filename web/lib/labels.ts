// User-facing labels for the listing enums — shared by the board's filters, its
// smart search, and the Companies directory, so every surface says the same thing.

import type { Job } from "./listings";

/** The UI calls `function` "Field" — plain language; the data field keeps its name. */
export const FIELD_LABELS: Record<Job["function"], string> = {
  engineering: "Engineering",
  data: "Data & AI",
  design: "Design",
  product: "Product",
  marketing: "Marketing",
  sales: "Sales",
  finance: "Finance",
  hr: "HR & People",
  operations: "Operations",
  "customer-support": "Customer support",
  legal: "Legal",
  healthcare: "Healthcare",
  education: "Education",
  hospitality: "Hospitality",
  manufacturing: "Manufacturing",
  retail: "Retail",
  construction: "Construction & property",
  other: "Other",
};

/** Field dropdown columns — every function appears exactly once. */
export const FIELD_GROUPS: { label: string; fields: Job["function"][] }[] = [
  { label: "Tech & product", fields: ["engineering", "data", "design", "product"] },
  {
    label: "Business",
    fields: ["finance", "operations", "customer-support", "sales", "hr", "marketing", "legal"],
  },
  {
    label: "Industry roles",
    fields: [
      "retail",
      "healthcare",
      "manufacturing",
      "construction",
      "hospitality",
      "education",
      "other",
    ],
  },
];

export const LEVEL_LABELS: Partial<Record<Job["level"], string>> = {
  internship: "Internship",
  entry: "Entry level",
  mid: "Mid-level",
  senior: "Senior",
};

export const SETUP_LABELS: Partial<Record<Job["workSetup"], string>> = {
  remote: "Remote",
  hybrid: "Hybrid",
  onsite: "On-site",
};

export const METRO_LABELS: Record<Job["metro"][number], string> = {
  ncr: "Metro Manila (NCR)",
  cebu: "Cebu",
  davao: "Davao",
  "clark-pampanga": "Clark · Pampanga",
  calabarzon: "Calabarzon",
  iloilo: "Iloilo",
  bacolod: "Bacolod",
  baguio: "Baguio",
  cdo: "Cagayan de Oro",
  "remote-ph": "Remote (PH)",
  "other-ph": "Other PH",
};

/** Registry industry tags are lowercase slugs; a few need hand-tuned labels. */
const INDUSTRY_LABELS: Record<string, string> = {
  saas: "SaaS",
  "ai-data": "AI & data",
  "hr-tech": "HR tech",
  "it-services": "IT services",
  ecommerce: "E-commerce",
};

export function industryLabel(tag: string): string {
  return INDUSTRY_LABELS[tag] ?? tag.replace(/-/g, " ").replace(/^./, (c) => c.toUpperCase());
}
