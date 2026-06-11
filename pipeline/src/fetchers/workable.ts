import { normalizeWorkable } from "../normalize.js";
import type { FetchResult, RegistryCompany } from "../types.js";
import { politeJsonGet, type HttpDeps } from "./http.js";

export function workableUrl(slug: string): string {
  return `https://apply.workable.com/api/v1/widget/accounts/${encodeURIComponent(slug)}`;
}

// Note: a live Workable account with no published widget jobs returns 200 with
// `jobs: []` — that is a successful (empty) fetch, not a dead slug. Unknown
// accounts return a real 404.
export async function fetchWorkable(
  company: RegistryCompany,
  deps: HttpDeps = {},
): Promise<FetchResult> {
  const outcome = await politeJsonGet(workableUrl(company.slug), deps);
  switch (outcome.kind) {
    case "ok":
      try {
        return { ok: true, postings: normalizeWorkable(company, outcome.body) };
      } catch (error) {
        return {
          ok: false,
          errorKind: "http",
          detail: error instanceof Error ? error.message : String(error),
        };
      }
    case "not-found":
      return {
        ok: false,
        errorKind: "dead-slug",
        detail: `account not found: ${company.slug}`,
      };
    case "http":
      return { ok: false, errorKind: "http", detail: `HTTP ${outcome.status}` };
    case "network":
      return { ok: false, errorKind: "network", detail: outcome.message };
  }
}
