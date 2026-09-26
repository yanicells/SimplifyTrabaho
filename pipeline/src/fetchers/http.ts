// Polite HTTP layer (SPEC §3.5): identifying User-Agent, ≥1s between requests,
// exponential backoff on 429/5xx/network errors, max 3 attempts, no retry on 404.

import type { FetchedPosting, FetchResult } from "../types.js";

export const USER_AGENT =
  "simplifytrabaho/0.1.0 (+https://github.com/yanicells/SimplifyTrabaho)";

export interface HttpDeps {
  fetchFn?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  /** Per-request wall-clock timeout. A fresh abort signal is created for every attempt. */
  timeoutMs?: number;
  /**
   * Treat any 3xx redirect as "not found" (→ dead-slug). BambooHR/Breezy redirect an
   * unknown or inactive tenant to a marketing page instead of returning 404. Off by
   * default so the six original fetchers are unchanged.
   */
  redirectIsNotFound?: boolean;
}

const realSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const POLITENESS_GAP_MS = 1000;
const MAX_ATTEMPTS = 3;
const BACKOFF_BASE_MS = 2000;
const DEFAULT_TIMEOUT_MS = 30_000;

export function requestSignal(timeoutMs = DEFAULT_TIMEOUT_MS): AbortSignal {
  return AbortSignal.timeout(timeoutMs);
}

export type HttpOutcome =
  | { kind: "ok"; body: unknown }
  | { kind: "not-found" }
  | { kind: "http"; status: number }
  | { kind: "network"; message: string };

export async function politeJsonGet(url: string, deps: HttpDeps = {}): Promise<HttpOutcome> {
  const fetchFn = deps.fetchFn ?? fetch;
  const sleep = deps.sleep ?? realSleep;
  const timeoutMs = deps.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  let last: HttpOutcome = { kind: "network", message: "request never attempted" };

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    await sleep(POLITENESS_GAP_MS);
    try {
      const response = await fetchFn(url, {
        headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
        signal: requestSignal(timeoutMs),
        ...(deps.redirectIsNotFound ? { redirect: "manual" as const } : {}),
      });
      if (response.status === 404) return { kind: "not-found" };
      if (
        deps.redirectIsNotFound &&
        (response.type === "opaqueredirect" ||
          (response.status >= 300 && response.status < 400))
      ) {
        return { kind: "not-found" };
      }
      if (response.ok) return { kind: "ok", body: await response.json() };
      last = { kind: "http", status: response.status };
      const retryable = response.status === 429 || response.status >= 500;
      if (!retryable) return last;
    } catch (error) {
      last = {
        kind: "network",
        message: error instanceof Error ? error.message : String(error),
      };
    }
    if (attempt < MAX_ATTEMPTS) await sleep(BACKOFF_BASE_MS * 2 ** (attempt - 1));
  }
  return last;
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Maps a failed HTTP outcome to a FetchResult; `notFound` is the dead-slug detail. */
export function failedFetch(
  outcome: Exclude<HttpOutcome, { kind: "ok" }>,
  notFound: string,
): FetchResult {
  switch (outcome.kind) {
    case "not-found":
      return { ok: false, errorKind: "dead-slug", detail: notFound };
    case "http":
      return { ok: false, errorKind: "http", detail: `HTTP ${outcome.status}` };
    case "network":
      return { ok: false, errorKind: "network", detail: outcome.message };
  }
}

/**
 * The whole fetcher for single-request JSON boards: one polite GET, then normalize.
 * A normalizer throw (malformed payload) becomes an "http" failure, never a crash.
 */
export async function fetchJsonBoard(
  url: string,
  normalize: (body: unknown) => FetchedPosting[],
  notFound: string,
  deps: HttpDeps = {},
): Promise<FetchResult> {
  const outcome = await politeJsonGet(url, deps);
  if (outcome.kind !== "ok") return failedFetch(outcome, notFound);
  try {
    return { ok: true, postings: normalize(outcome.body) };
  } catch (error) {
    return { ok: false, errorKind: "http", detail: errorMessage(error) };
  }
}

/**
 * Fetch queues for `pnpm refresh`: one per ATS, so each queue maps to one API host
 * (per-tenant subdomains like {slug}.bamboohr.com share a queue — stricter than
 * needed) and ALL Workday tenants share one queue (conservative, SPEC §17.1.3).
 * Queues run concurrently; each runs sequentially, so the per-request politeness
 * sleep above still guarantees the gap per host.
 */
export function groupByHost<T extends { ats: string }>(companies: T[]): T[][] {
  const groups = new Map<string, T[]>();
  for (const company of companies) {
    const group = groups.get(company.ats) ?? [];
    group.push(company);
    groups.set(company.ats, group);
  }
  return [...groups.values()];
}
