import { normalizeTeamtailor } from "../normalize.js";
import type { FetchedPosting, FetchResult, RegistryCompany } from "../types.js";
import { errorMessage, failedFetch, politeTextGet, type HttpDeps } from "./http.js";

const PAGE_SIZE = 100; // the feed's documented default page size
// Safety cap only (5,000 jobs). Hitting it returns a `partial` result so merge never
// deactivates the listings beyond it.
const MAX_PAGES = 50;

export function teamtailorUrl(slug: string, offset = 0): string {
  return `https://${encodeURIComponent(slug)}.teamtailor.com/jobs.rss?offset=${offset}&per_page=${PAGE_SIZE}`;
}

// Teamtailor public RSS feed (support.teamtailor.com "RSS feed: how-to guide", verified
// live 2026-09-26): anonymous XML, 100 items per page via offset/per_page, with pubDate,
// link, remoteStatus and tt:locations. Items carry JD HTML in <description>, which
// normalizeTeamtailor strips before reading anything. Unknown tenant → 404.
export async function fetchTeamtailor(
  company: RegistryCompany,
  deps: HttpDeps = {},
): Promise<FetchResult> {
  const postings: FetchedPosting[] = [];
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const outcome = await politeTextGet(teamtailorUrl(company.slug, page * PAGE_SIZE), deps);
    if (outcome.kind !== "ok")
      return failedFetch(outcome, `career site not found: ${company.slug}`);
    let batch: FetchedPosting[];
    try {
      batch = normalizeTeamtailor(company, outcome.body);
    } catch (error) {
      return { ok: false, errorKind: "http", detail: errorMessage(error) };
    }
    postings.push(...batch);
    if (batch.length < PAGE_SIZE) return { ok: true, postings };
  }
  return { ok: true, postings, partial: true };
}
