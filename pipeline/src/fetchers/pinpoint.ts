import { normalizePinpoint } from "../normalize.js";
import type { FetchResult, RegistryCompany } from "../types.js";
import { fetchJsonBoard, type HttpDeps } from "./http.js";

export function pinpointUrl(slug: string): string {
  return `https://${encodeURIComponent(slug)}.pinpointhq.com/postings.json`;
}

// Pinpoint public postings feed (verified live 2026-09-26): anonymous JSON `{ data: [...] }`
// with apply URL, workplace type, employment type and published compensation. Each item
// also carries JD HTML fields that normalizePinpoint never reads. Unknown tenant → 404.
export function fetchPinpoint(
  company: RegistryCompany,
  deps: HttpDeps = {},
): Promise<FetchResult> {
  return fetchJsonBoard(
    pinpointUrl(company.slug),
    (body) => normalizePinpoint(company, body),
    `board not found: ${company.slug}`,
    deps,
  );
}
