import { normalizeLever } from "../normalize.js";
import type { FetchResult, RegistryCompany } from "../types.js";
import { politeJsonGet, type HttpDeps } from "./http.js";

export function leverUrl(slug: string): string {
  return `https://api.lever.co/v0/postings/${encodeURIComponent(slug)}?mode=json`;
}

export async function fetchLever(
  company: RegistryCompany,
  deps: HttpDeps = {},
): Promise<FetchResult> {
  const outcome = await politeJsonGet(leverUrl(company.slug), deps);
  switch (outcome.kind) {
    case "ok":
      try {
        return { ok: true, postings: normalizeLever(company, outcome.body) };
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
