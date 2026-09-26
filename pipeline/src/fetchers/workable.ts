import { normalizeWorkable } from "../normalize.js";
import type { FetchResult, RegistryCompany } from "../types.js";
import { fetchJsonBoard, type HttpDeps } from "./http.js";

export function workableUrl(slug: string): string {
  return `https://apply.workable.com/api/v1/widget/accounts/${encodeURIComponent(slug)}`;
}

// Note: a live Workable account with no published widget jobs returns 200 with
// `jobs: []` — that is a successful (empty) fetch, not a dead slug. Unknown
// accounts return a real 404.
export function fetchWorkable(
  company: RegistryCompany,
  deps: HttpDeps = {},
): Promise<FetchResult> {
  return fetchJsonBoard(
    workableUrl(company.slug),
    (body) => normalizeWorkable(company, body),
    `account not found: ${company.slug}`,
    deps,
  );
}
