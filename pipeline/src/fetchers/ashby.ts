import { normalizeAshby } from "../normalize.js";
import type { FetchResult, RegistryCompany } from "../types.js";
import { fetchJsonBoard, type HttpDeps } from "./http.js";

export function ashbyUrl(slug: string): string {
  return `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(slug)}?includeCompensation=true`;
}

export function fetchAshby(
  company: RegistryCompany,
  deps: HttpDeps = {},
): Promise<FetchResult> {
  return fetchJsonBoard(
    ashbyUrl(company.slug),
    (body) => normalizeAshby(company, body),
    `board not found: ${company.slug}`,
    deps,
  );
}
