import { normalizeBambooHr } from "../normalize.js";
import type { FetchResult, RegistryCompany } from "../types.js";
import { politeJsonGet, type HttpDeps } from "./http.js";

export function bambooHrUrl(slug: string): string {
  return `https://${encodeURIComponent(slug)}.bamboohr.com/careers/list`;
}

// BambooHR public careers feed (verified live 2026-06-13): anonymous JSON
// `{ meta:{totalCount}, result:[…] }`. Unknown/inactive tenants 3xx-redirect to a
// marketing page instead of 404ing, so we opt into redirect→dead-slug. A live board
// with zero jobs (`result:[]`) is a successful empty fetch — keeps PH-HQ entries.
export async function fetchBambooHr(
  company: RegistryCompany,
  deps: HttpDeps = {},
): Promise<FetchResult> {
  const outcome = await politeJsonGet(bambooHrUrl(company.slug), {
    ...deps,
    redirectIsNotFound: true,
  });
  switch (outcome.kind) {
    case "ok":
      try {
        return { ok: true, postings: normalizeBambooHr(company, outcome.body) };
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
