import { normalizeBreezy } from "../normalize.js";
import type { FetchResult, RegistryCompany } from "../types.js";
import { fetchJsonBoard, type HttpDeps } from "./http.js";

export function breezyUrl(slug: string): string {
  return `https://${encodeURIComponent(slug)}.breezy.hr/json`;
}

// Breezy public feed (verified live 2026-06-13): anonymous JSON array, apply URL and
// published date included, no JD text. Unknown tenants 3xx-redirect to breezy.hr.
export function fetchBreezy(
  company: RegistryCompany,
  deps: HttpDeps = {},
): Promise<FetchResult> {
  return fetchJsonBoard(
    breezyUrl(company.slug),
    (body) => normalizeBreezy(company, body),
    `board not found: ${company.slug}`,
    { ...deps, redirectIsNotFound: true },
  );
}
