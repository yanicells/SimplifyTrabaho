import { normalizeRecruitee } from "../normalize.js";
import type { FetchResult, RegistryCompany } from "../types.js";
import { fetchJsonBoard, type HttpDeps } from "./http.js";

export function recruiteeUrl(slug: string): string {
  return `https://${encodeURIComponent(slug)}.recruitee.com/api/offers/`;
}

export function fetchRecruitee(
  company: RegistryCompany,
  deps: HttpDeps = {},
): Promise<FetchResult> {
  return fetchJsonBoard(
    recruiteeUrl(company.slug),
    (body) => normalizeRecruitee(company, body),
    `board not found: ${company.slug}`,
    deps,
  );
}
