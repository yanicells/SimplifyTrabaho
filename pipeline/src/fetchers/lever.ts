import { normalizeLever } from "../normalize.js";
import type { FetchResult, RegistryCompany } from "../types.js";
import { fetchJsonBoard, type HttpDeps } from "./http.js";

export function leverUrl(slug: string): string {
  return `https://api.lever.co/v0/postings/${encodeURIComponent(slug)}?mode=json`;
}

export function fetchLever(
  company: RegistryCompany,
  deps: HttpDeps = {},
): Promise<FetchResult> {
  return fetchJsonBoard(
    leverUrl(company.slug),
    (body) => normalizeLever(company, body),
    `board not found: ${company.slug}`,
    deps,
  );
}
