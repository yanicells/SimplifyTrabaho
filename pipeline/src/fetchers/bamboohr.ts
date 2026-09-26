import { normalizeBambooHr } from "../normalize.js";
import type { FetchResult, RegistryCompany } from "../types.js";
import { fetchJsonBoard, type HttpDeps } from "./http.js";

export function bambooHrUrl(slug: string): string {
  return `https://${encodeURIComponent(slug)}.bamboohr.com/careers/list`;
}

// BambooHR public careers feed (verified live 2026-06-13): anonymous JSON
// `{ meta:{totalCount}, result:[…] }`. Unknown/inactive tenants 3xx-redirect to a
// marketing page instead of 404ing, so we opt into redirect→dead-slug. A live board
// with zero jobs (`result:[]`) is a successful empty fetch — keeps PH-HQ entries.
export function fetchBambooHr(
  company: RegistryCompany,
  deps: HttpDeps = {},
): Promise<FetchResult> {
  return fetchJsonBoard(
    bambooHrUrl(company.slug),
    (body) => normalizeBambooHr(company, body),
    `board not found: ${company.slug}`,
    { ...deps, redirectIsNotFound: true },
  );
}
