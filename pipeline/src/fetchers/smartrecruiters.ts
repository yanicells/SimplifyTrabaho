import { normalizeSmartRecruiters } from "../normalize.js";
import type { FetchedPosting, FetchResult, RegistryCompany } from "../types.js";
import { politeJsonGet, type HttpDeps, type HttpOutcome } from "./http.js";

const PAGE_LIMIT = 100;

export function smartRecruitersUrl(slug: string, offset = 0): string {
  return `https://api.smartrecruiters.com/v1/companies/${encodeURIComponent(slug)}/postings?country=ph&limit=${PAGE_LIMIT}&offset=${offset}`;
}

/** Unfiltered one-posting probe: tells a live company with 0 PH jobs from an unknown one. */
export function smartRecruitersLivenessUrl(slug: string): string {
  return `https://api.smartrecruiters.com/v1/companies/${encodeURIComponent(slug)}/postings?limit=1`;
}

function failure(outcome: Exclude<HttpOutcome, { kind: "ok" }>, slug: string): FetchResult {
  if (outcome.kind === "not-found") {
    return { ok: false, errorKind: "dead-slug", detail: `company not found: ${slug}` };
  }
  if (outcome.kind === "http") {
    return { ok: false, errorKind: "http", detail: `HTTP ${outcome.status}` };
  }
  return { ok: false, errorKind: "network", detail: outcome.message };
}

// SmartRecruiters quirks (verified live 2026-06-11; country filter 2026-09-25):
// - `country=ph` filters at the source (AECOM: 5,312 global postings → 95 PH, one
//   request instead of 54).
// - Unknown companies return 200 with totalFound 0. When the PH-filtered result is
//   empty, one unfiltered `limit=1` probe disambiguates: any posting at all = live
//   company with zero PH jobs (success); none = dead-slug. Freezing the company's
//   listings beats mass-deactivating them on a renamed identifier.
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
    if (outcome.kind !== "ok") return failure(outcome, company.slug);
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
    const probe = await politeJsonGet(smartRecruitersLivenessUrl(company.slug), deps);
    if (probe.kind !== "ok") return failure(probe, company.slug);
    const anyTotal = (probe.body as { totalFound?: unknown }).totalFound;
    if (typeof anyTotal === "number" && anyTotal > 0) return { ok: true, postings };
    return {
      ok: false,
      errorKind: "dead-slug",
      detail: `empty result for ${company.slug} — unknown identifier or zero postings`,
    };
  }
  // A non-advancing page stopped us short of totalFound — merge must not treat it as complete.
  return postings.length < totalFound
    ? { ok: true, postings, partial: true }
    : { ok: true, postings };
}
