// Full filter state ⇆ URL query params (SPEC §12 v2). Pasting a URL reproduces
// the view; the default view — all roles, no filters — keeps a clean URL. The codec is
// forgiving on input — junk values are dropped, never thrown — because shared
// links get mangled by chat apps and trackers.

import {
  METRO_TAGS,
  type CompanyType,
  type JobFunction,
  type MetroTag,
  type WorkSetup,
} from "../../pipeline/src/types";

export const SELECTABLE_LEVELS = ["internship", "entry", "mid", "senior"] as const;
export type SelectableLevel = (typeof SELECTABLE_LEVELS)[number];

export const SELECTABLE_FUNCTIONS = [
  "engineering",
  "data",
  "design",
  "product",
  "marketing",
  "sales",
  "finance",
  "hr",
  "operations",
  "customer-support",
  "legal",
  "healthcare",
  "education",
  "hospitality",
  "manufacturing",
  "retail",
  "construction",
  "other",
] as const satisfies readonly JobFunction[];

const WORK_SETUPS = ["onsite", "hybrid", "remote"] as const;
const COMPANY_TYPES = ["direct", "agency"] as const satisfies readonly CompanyType[];

export interface Filters {
  /** Empty array = all roles (no level filter). */
  levels: SelectableLevel[];
  /** Empty array = any function. */
  fns: JobFunction[];
  setup: "all" | WorkSetup;
  metro: "all" | MetroTag;
  industry: "all" | string;
  /** Employer type — direct employers vs staffing/outsourcing agencies (schema v3). */
  type: "all" | CompanyType;
  location: string;
  query: string;
  /** Exact company-name match (set from the Companies directory). Empty = any. */
  company: string;
}

export function defaultFilters(): Filters {
  return {
    levels: [],
    fns: [],
    setup: "all",
    metro: "all",
    industry: "all",
    type: "all",
    location: "",
    query: "",
    company: "",
  };
}

function inCanonicalOrder<T extends string>(values: T[], order: readonly T[]): T[] {
  return order.filter((v) => values.includes(v));
}

export function filtersToSearch(filters: Filters): string {
  const params = new URLSearchParams();
  // All roles is the default view, so it needs no param at all.
  if (filters.levels.length > 0) {
    params.set("level", inCanonicalOrder(filters.levels, SELECTABLE_LEVELS).join(","));
  }
  if (filters.fns.length > 0) {
    params.set("fn", inCanonicalOrder(filters.fns, SELECTABLE_FUNCTIONS).join(","));
  }
  if (filters.setup !== "all") params.set("setup", filters.setup);
  if (filters.metro !== "all") params.set("metro", filters.metro);
  if (filters.industry !== "all") params.set("industry", filters.industry);
  if (filters.type !== "all") params.set("type", filters.type);
  if (filters.location !== "") params.set("loc", filters.location);
  if (filters.query !== "") params.set("q", filters.query);
  if (filters.company !== "") params.set("company", filters.company);
  return params.toString();
}

function parseList<T extends string>(raw: string | null, allowed: readonly T[]): T[] {
  if (raw === null) return [];
  return inCanonicalOrder(
    raw.split(",").filter((v): v is T => (allowed as readonly string[]).includes(v)),
    allowed,
  );
}

export function filtersFromSearch(search: string): Filters {
  const filters = defaultFilters();
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);

  // "all" is not a level, so old links carrying level=all parse to [] — which is
  // now exactly the default view.
  filters.levels = parseList(params.get("level"), SELECTABLE_LEVELS);

  filters.fns = parseList(params.get("fn"), SELECTABLE_FUNCTIONS);

  const setup = params.get("setup");
  if ((WORK_SETUPS as readonly string[]).includes(setup ?? "")) {
    filters.setup = setup as WorkSetup;
  }
  const metro = params.get("metro");
  if ((METRO_TAGS as readonly string[]).includes(metro ?? "")) {
    filters.metro = metro as MetroTag;
  }
  const industry = params.get("industry");
  if (industry !== null && industry !== "") filters.industry = industry;

  const type = params.get("type");
  if ((COMPANY_TYPES as readonly string[]).includes(type ?? "")) {
    filters.type = type as CompanyType;
  }

  filters.location = params.get("loc") ?? "";
  filters.query = params.get("q") ?? "";
  filters.company = params.get("company") ?? "";
  return filters;
}
