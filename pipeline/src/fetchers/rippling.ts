import { normalizeRippling } from "../normalize.js";
import type { FetchResult, RegistryCompany } from "../types.js";
import { fetchJsonBoard, type HttpDeps } from "./http.js";

export function ripplingUrl(slug: string): string {
  return `https://api.rippling.com/platform/api/ats/v1/board/${encodeURIComponent(slug)}/jobs`;
}

// Rippling's documented public Job Board API (developer.rippling.com, verified live
// 2026-09-26): anonymous JSON array of { uuid, name, department, url, workLocation },
// one row per job location, no JD text. Unknown board → 404 "Job Board not found".
export function fetchRippling(
  company: RegistryCompany,
  deps: HttpDeps = {},
): Promise<FetchResult> {
  return fetchJsonBoard(
    ripplingUrl(company.slug),
    (body) => normalizeRippling(company, body),
    `board not found: ${company.slug}`,
    deps,
  );
}
