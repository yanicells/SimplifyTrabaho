import { normalizeSmartRecruiters } from "../normalize.js";
import type { FetchedPosting, FetchResult, RegistryCompany } from "../types.js";
import { politeJsonGet, type HttpDeps } from "./http.js";

const PAGE_LIMIT = 100;

export function smartRecruitersUrl(slug: string, offset = 0): string {
  return `https://api.smartrecruiters.com/v1/companies/${encodeURIComponent(slug)}/postings?limit=${PAGE_LIMIT}&offset=${offset}`;
}

// SmartRecruiters quirks (verified live 2026-06-11):
// - Unknown companies return 200 with totalFound 0 — indistinguishable from a real
//   company with zero postings, so empty results are flagged dead-slug. Freezing the
//   company's listings beats mass-deactivating them on a renamed identifier.
// - Results are paginated (limit 100); fetch every page before returning.
export async function fetchSmartRecruiters(
  company: RegistryCompany,
  deps: HttpDeps = {},
): Promise<FetchResult> {
  const postings: FetchedPosting[] = [];
  let offset = 0;
  let totalFound = Number.POSITIVE_INFINITY;

  while (offset < totalFound) {
    const outcome = await politeJsonGet(smartRecruitersUrl(company.slug, offset), deps);
    if (outcome.kind === "not-found") {
      return { ok: false, errorKind: "dead-slug", detail: `company not found: ${company.slug}` };
    }
    if (outcome.kind === "http") {
      return { ok: false, errorKind: "http", detail: `HTTP ${outcome.status}` };
    }
    if (outcome.kind === "network") {
      return { ok: false, errorKind: "network", detail: outcome.message };
    }
    const body = outcome.body as { totalFound?: unknown; content?: unknown };
    totalFound = typeof body.totalFound === "number" ? body.totalFound : 0;
    try {
      const page = normalizeSmartRecruiters(company, body);
      postings.push(...page);
      if (page.length === 0) break; // defensive: never loop on a non-advancing page
      offset += page.length;
    } catch (error) {
      return {
        ok: false,
        errorKind: "http",
        detail: error instanceof Error ? error.message : String(error),
      };
    }
  }

  if (postings.length === 0) {
    return {
      ok: false,
      errorKind: "dead-slug",
      detail: `empty result for ${company.slug} — unknown identifier or zero postings`,
    };
  }
  return { ok: true, postings };
}
