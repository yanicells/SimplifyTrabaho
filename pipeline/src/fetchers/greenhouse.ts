import { normalizeGreenhouse } from "../normalize.js";
import type { FetchResult, RegistryCompany } from "../types.js";
import { fetchJsonBoard, type HttpDeps } from "./http.js";

export function greenhouseUrl(slug: string): string {
  return `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(slug)}/jobs`;
}

export function fetchGreenhouse(
  company: RegistryCompany,
  deps: HttpDeps = {},
): Promise<FetchResult> {
  return fetchJsonBoard(
    greenhouseUrl(company.slug),
    (body) => normalizeGreenhouse(company, body),
    `board not found: ${company.slug}`,
    deps,
  );
}
