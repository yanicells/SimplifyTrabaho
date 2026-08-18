import { normalizeManatal } from "../normalize.js";
import type { FetchedPosting, FetchResult, RegistryCompany } from "../types.js";
import { politeJsonGet, type HttpDeps } from "./http.js";

const PAGE_SIZE = 100;
const MAX_PAGES = 20; // 2,000 postings cap — no single PH client is anywhere near this

export function manatalUrl(slug: string): string {
  return `https://www.careers-page.com/api/v1.0/c/${encodeURIComponent(slug)}/jobs/?page_size=${PAGE_SIZE}&page=1`;
}

// Manatal public career-page API (verified live 2026-06-13): anonymous, paginated JSON
// `{ count, next, previous, results:[…] }`. Unknown client → 404. The list carries a JD
// `description` we never read (normalizeManatal drops it). Empty results = live empty.
export async function fetchManatal(
  company: RegistryCompany,
  deps: HttpDeps = {},
): Promise<FetchResult> {
  const postings: FetchedPosting[] = [];
  let url: string | null = manatalUrl(company.slug);
  let pages = 0;

  while (url && pages < MAX_PAGES) {
    const outcome = await politeJsonGet(url, deps);
    if (outcome.kind === "not-found") {
      return {
        ok: false,
        errorKind: "dead-slug",
        detail: `client not found: ${company.slug}`,
      };
    }
    if (outcome.kind === "http")
      return { ok: false, errorKind: "http", detail: `HTTP ${outcome.status}` };
    if (outcome.kind === "network")
      return { ok: false, errorKind: "network", detail: outcome.message };
    try {
      postings.push(...normalizeManatal(company, outcome.body));
    } catch (error) {
      return {
        ok: false,
        errorKind: "http",
        detail: error instanceof Error ? error.message : String(error),
      };
    }
    const next = (outcome.body as { next?: unknown }).next;
    url = typeof next === "string" && next !== "" ? next : null;
    pages += 1;
  }
  return { ok: true, postings };
}
