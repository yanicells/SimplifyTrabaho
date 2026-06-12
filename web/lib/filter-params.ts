// Full filter state ⇆ URL query params (SPEC §12 v2). Pasting a URL reproduces
// the view; the default featured view keeps a clean URL (no params). The codec is
// forgiving on input — junk values are dropped, never thrown — because shared
// links get mangled by chat apps and trackers.

import {
  METRO_TAGS,
  type JobFunction,
  type Level,
  type MetroTag,
  type WorkSetup,
} from "../../pipeline/src/types";

export const SELECTABLE_LEVELS = ["internship", "entry", "mid", "senior"] as const;
export type SelectableLevel = (typeof SELECTABLE_LEVELS)[number];

/** The featured default: interns & fresh grads (SPEC §12). */
export const DEFAULT_LEVELS: readonly SelectableLevel[] = ["internship", "entry"];

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

export interface Filters {
  /** Empty array = all roles (no level filter). */
  levels: SelectableLevel[];
  /** Empty array = any function. */
  fns: JobFunction[];
  setup: "all" | WorkSetup;
  metro: "all" | MetroTag;
  industry: "all" | string;
  location: string;
  query: string;
}

export function defaultFilters(): Filters {
  return {
    levels: [...DEFAULT_LEVELS],
    fns: [],
    setup: "all",
    metro: "all",
    industry: "all",
    location: "",
    query: "",
  };
}

function inCanonicalOrder<T extends string>(values: T[], order: readonly T[]): T[] {
  return order.filter((v) => values.includes(v));
}

function sameSet(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((v) => b.includes(v));
}

export function filtersToSearch(filters: Filters): string {
  const params = new URLSearchParams();
  if (filters.levels.length === 0) {
    params.set("level", "all");
  } else if (!sameSet(filters.levels, DEFAULT_LEVELS)) {
    params.set("level", inCanonicalOrder(filters.levels, SELECTABLE_LEVELS).join(","));
  }
  if (filters.fns.length > 0) {
    params.set("fn", inCanonicalOrder(filters.fns, SELECTABLE_FUNCTIONS).join(","));
  }
  if (filters.setup !== "all") params.set("setup", filters.setup);
  if (filters.metro !== "all") params.set("metro", filters.metro);
  if (filters.industry !== "all") params.set("industry", filters.industry);
  if (filters.location !== "") params.set("loc", filters.location);
  if (filters.query !== "") params.set("q", filters.query);
  return params.toString();
}

function parseList<T extends string>(
  raw: string | null,
  allowed: readonly T[],
): T[] {
  if (raw === null) return [];
  return inCanonicalOrder(
    raw.split(",").filter((v): v is T => (allowed as readonly string[]).includes(v)),
    allowed,
  );
}

export function filtersFromSearch(search: string): Filters {
  const filters = defaultFilters();
  const params = new URLSearchParams(
    search.startsWith("?") ? search.slice(1) : search,
  );

  const level = params.get("level");
  if (level === "all") {
    filters.levels = [];
  } else {
    const levels = parseList(level, SELECTABLE_LEVELS);
    if (levels.length > 0) filters.levels = levels;
  }

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

  filters.location = params.get("loc") ?? "";
  filters.query = params.get("q") ?? "";
  return filters;
}
