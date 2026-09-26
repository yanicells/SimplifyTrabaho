import type { Filters } from "./filter-params";
import type { Job } from "./listings";
import { matchesQuery, parseQuery } from "./search";

/** Rows per infinite-scroll step — also the rows the static HTML ships with. */
export const PAGE_SIZE = 60;

export interface FilterResult {
  filtered: Job[];
  /** Per-field counts against every OTHER filter, so picking a field never zeroes its siblings. */
  fieldCounts: Partial<Record<Job["function"], number>>;
  /** No-level roles an active level filter is hiding. */
  noLevelCount: number;
}

/**
 * The board's one filtering pass. Shared by the browser (live results) and the
 * build (the default view's counts, shown before the full list has loaded).
 * `searchKeys[i]` belongs to `jobs[i]`; it's only read when the query has terms.
 */
export function filterJobs(jobs: Job[], searchKeys: string[], filters: Filters): FilterResult {
  const { setup, metro, type: employerType, company, noLevel } = filters;
  const terms = parseQuery(filters.query);
  const levelSet = new Set<string>(filters.levels);
  const fnSet = new Set<string>(filters.fns);
  const fieldCounts: FilterResult["fieldCounts"] = {};
  let noLevelCount = 0;
  const filtered: Job[] = [];
  for (let i = 0; i < jobs.length; i++) {
    const job = jobs[i];
    if (setup !== "all" && job.workSetup !== setup) continue;
    if (metro !== "all" && !job.metro.includes(metro)) continue;
    if (employerType !== "all" && job.companyType !== employerType) continue;
    if (company !== "" && job.company !== company) continue;
    if (terms.length > 0 && !matchesQuery(searchKeys[i], terms)) continue;
    const fnOk = fnSet.size === 0 || fnSet.has(job.function);
    if (levelSet.size > 0 && job.level === "unknown" && fnOk) noLevelCount++;
    const levelOk =
      levelSet.size === 0 || levelSet.has(job.level) || (noLevel && job.level === "unknown");
    if (!levelOk) continue;
    fieldCounts[job.function] = (fieldCounts[job.function] ?? 0) + 1;
    if (fnOk) filtered.push(job);
  }
  return { filtered, fieldCounts, noLevelCount };
}
