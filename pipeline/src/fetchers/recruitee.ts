import { normalizeRecruitee } from "../normalize.js";
import type { FetchResult, RegistryCompany } from "../types.js";
import { politeJsonGet, type HttpDeps } from "./http.js";

export function recruiteeUrl(slug: string): string {
  return `https://${encodeURIComponent(slug)}.recruitee.com/api/offers/`;
}

export async function fetchRecruitee(
  company: RegistryCompany,
  deps: HttpDeps = {},
): Promise<FetchResult> {
  const outcome = await politeJsonGet(recruiteeUrl(company.slug), deps);
  switch (outcome.kind) {
    case "ok":
      try {
        return { ok: true, postings: normalizeRecruitee(company, outcome.body) };
      } catch (error) {
        return {
          ok: false,
          errorKind: "http",
          detail: error instanceof Error ? error.message : String(error),
        };
      }
    case "not-found":
      return { ok: false, errorKind: "dead-slug", detail: `board not found: ${company.slug}` };
    case "http":
      return { ok: false, errorKind: "http", detail: `HTTP ${outcome.status}` };
    case "network":
      return { ok: false, errorKind: "network", detail: outcome.message };
  }
}
