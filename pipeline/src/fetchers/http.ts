// Polite HTTP layer (SPEC §3.5): identifying User-Agent, ≥1s between requests,
// exponential backoff on 429/5xx/network errors, max 3 attempts, no retry on 404.

export const USER_AGENT =
  "simplifytrabaho/0.1.0 (+https://github.com/yanicells/SimplifyTrabaho)";

export interface HttpDeps {
  fetchFn?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
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

export type HttpOutcome =
  | { kind: "ok"; body: unknown }
  | { kind: "not-found" }
  | { kind: "http"; status: number }
  | { kind: "network"; message: string };

export async function politeJsonGet(url: string, deps: HttpDeps = {}): Promise<HttpOutcome> {
  const fetchFn = deps.fetchFn ?? fetch;
  const sleep = deps.sleep ?? realSleep;
  let last: HttpOutcome = { kind: "network", message: "request never attempted" };

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    await sleep(POLITENESS_GAP_MS);
    try {
      const response = await fetchFn(url, {
        headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
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
