import { normalizeBreezy } from "../normalize.js";
import type { FetchResult, RegistryCompany } from "../types.js";
import { politeJsonGet, type HttpDeps } from "./http.js";

export function breezyUrl(slug: string): string {
  return `https://${encodeURIComponent(slug)}.breezy.hr/json`;
}

// Breezy public feed (verified live 2026-06-13): anonymous JSON array, apply URL and
// published date included, no JD text. Unknown tenants 3xx-redirect to breezy.hr.
export async function fetchBreezy(
  company: RegistryCompany,
  deps: HttpDeps = {},
): Promise<FetchResult> {
  const outcome = await politeJsonGet(breezyUrl(company.slug), {
    ...deps,
    redirectIsNotFound: true,
  });
  switch (outcome.kind) {
    case "ok":
      try {
        return { ok: true, postings: normalizeBreezy(company, outcome.body) };
      } catch (error) {
        return { ok: false, errorKind: "http", detail: error instanceof Error ? error.message : String(error) };
      }
    case "not-found":
      return { ok: false, errorKind: "dead-slug", detail: `board not found: ${company.slug}` };
    case "http":
      return { ok: false, errorKind: "http", detail: `HTTP ${outcome.status}` };
    case "network":
      return { ok: false, errorKind: "network", detail: outcome.message };
  }
}
