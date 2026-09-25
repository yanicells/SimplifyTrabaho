import { normalizeWorkday, parseWorkdaySlug } from "../normalize.js";
import type { FetchResult, RegistryCompany } from "../types.js";
import { requestSignal, USER_AGENT, type HttpDeps } from "./http.js";

export { parseWorkdaySlug };

// Workday adapter — Tier B (SPEC §17). Every rule below is a guardrail, not an
// optimization: robots.txt gate before the first byte, instant PERMANENT stop on
// any block signal (401/403/422/429 or an HTML bot-challenge page — the caller
// records the block and skips the tenant on all future runs), ≥2s politeness,
// sequential pagination with a hard cap, jobs-list endpoint ONLY (job detail
// pages carry JD text and multiply request volume — never fetch them).
// NEVER add retries, UA changes, or any block-evasion here. A closed door means no.
// Equally, a 5xx/timeout/network error is NOT a closed door — it must surface as a
// transient "http"/"network" failure (retry next run), never as "blocked".

const POLITENESS_GAP_MS = 2000; // stricter than the ≥1s Tier-A rule (§17.1.3)
const PAGE_SIZE = 20; // the page's own request size
const MAX_POSTINGS = 1000; // §17.1.3 pagination cap
/** Above this total we look for a Philippines facet instead of bulk-pulling (§17.1.4). */
const FACET_TRIGGER_TOTAL = 500;

const realSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * robots.txt check for our jobs path (RFC 9309 groups: consecutive User-agent
 * lines share the rules that follow). Conservative on purpose: Disallow rules
 * from BOTH the `*` group and any group naming us apply, and Allow rules are
 * ignored — so we can only ever over-block, never under-block.
 */
export function robotsAllowsJobsPath(robotsTxt: string, jobsPath: string): boolean {
  let applies = false;
  let readingAgents = false; // inside a run of consecutive User-agent lines
  const disallows: string[] = [];
  for (const raw of robotsTxt.split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, "");
    const colon = line.indexOf(":");
    if (colon === -1) continue;
    const field = line.slice(0, colon).trim().toLowerCase();
    const value = line.slice(colon + 1).trim();
    if (field === "user-agent") {
      const ours = value === "*" || value.toLowerCase().includes("simplifytrabaho");
      applies = (readingAgents && applies) || ours;
      readingAgents = true;
      continue;
    }
    readingAgents = false;
    if (field === "disallow" && applies && value !== "") disallows.push(value);
  }
  return !disallows.some((rule) => robotsRuleMatches(rule, jobsPath));
}

/** RFC 9309 path match: prefix match, `*` = any run of characters, trailing `$` = end. */
function robotsRuleMatches(rule: string, path: string): boolean {
  const anchored = rule.endsWith("$");
  const pattern = (anchored ? rule.slice(0, -1) : rule)
    .split("*")
    .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, "\\$&"))
    .join(".*");
  return new RegExp(`^${pattern}${anchored ? "$" : ""}`).test(path);
}

interface WorkdayPage {
  total?: unknown;
  jobPostings?: unknown;
  facets?: unknown;
}

interface FacetNode {
  facetParameter?: unknown;
  descriptor?: unknown;
  id?: unknown;
  values?: unknown;
}

/**
 * Find a Philippines value in the page's own facet list (§17.1.4). Facet groups
 * can nest (Accenture: locationMainGroup > Country > Philippines); the nested
 * group carries the facetParameter that appliedFacets must use.
 */
function findPhilippinesFacet(
  nodes: unknown,
  parameter: string | null = null,
): { parameter: string; id: string } | null {
  if (!Array.isArray(nodes)) return null;
  for (const raw of nodes) {
    const node = raw as FacetNode;
    const ownParameter =
      typeof node?.facetParameter === "string" ? node.facetParameter : parameter;
    if (
      ownParameter !== null &&
      String(node?.descriptor ?? "").toLowerCase() === "philippines" &&
      typeof node?.id === "string"
    ) {
      return { parameter: ownParameter, id: node.id };
    }
    const nested = findPhilippinesFacet(node?.values, ownParameter);
    if (nested) return nested;
  }
  return null;
}

const BLOCK_STATUSES = new Set([401, 403, 422, 429]);

type PageOutcome =
  | { kind: "ok"; page: WorkdayPage }
  | { kind: "blocked"; detail: string }
  | { kind: "http"; status: number }
  | { kind: "network"; message: string };

async function postJobsPage(
  fetchFn: typeof fetch,
  sleep: (ms: number) => Promise<void>,
  url: string,
  appliedFacets: Record<string, string[]>,
  offset: number,
  timeoutMs: number,
): Promise<PageOutcome> {
  await sleep(POLITENESS_GAP_MS);
  try {
    const response = await fetchFn(url, {
      method: "POST",
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ appliedFacets, limit: PAGE_SIZE, offset, searchText: "" }),
      signal: requestSignal(timeoutMs),
    });
    if (BLOCK_STATUSES.has(response.status)) {
      return { kind: "blocked", detail: `HTTP ${response.status} — permanent stop (§17.1.2)` };
    }
    if (!response.ok) return { kind: "http", status: response.status };
    // Read the body first: a timeout or reset mid-body is a network error, not a block.
    const text = await response.text();
    try {
      return { kind: "ok", page: JSON.parse(text) as WorkdayPage };
    } catch {
      // Only an HTML page (Akamai bot challenge) is a block; other garbage is transient.
      if (!/<html|<!doctype/i.test(text)) {
        return { kind: "network", message: "malformed JSON response" };
      }
      return {
        kind: "blocked",
        detail: "HTML instead of JSON (bot challenge) — permanent stop (§17.1.2)",
      };
    }
  } catch (error) {
    return {
      kind: "network",
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function fetchWorkday(
  company: RegistryCompany,
  deps: HttpDeps = {},
): Promise<FetchResult> {
  const fetchFn = deps.fetchFn ?? fetch;
  const sleep = deps.sleep ?? realSleep;
  const timeoutMs = deps.timeoutMs ?? 30_000;

  let parsed: ReturnType<typeof parseWorkdaySlug>;
  try {
    parsed = parseWorkdaySlug(company.slug);
  } catch (error) {
    return {
      ok: false,
      errorKind: "dead-slug",
      detail: error instanceof Error ? error.message : String(error),
    };
  }
  const { tenant, host, site } = parsed;
  const jobsPath = `/wday/cxs/${tenant}/${site}/jobs`;
  const jobsUrl = `https://${host}${jobsPath}`;

  // Guardrail 1: robots.txt before the first fetch of any tenant.
  await sleep(POLITENESS_GAP_MS);
  try {
    const robots = await fetchFn(`https://${host}/robots.txt`, {
      headers: { "User-Agent": USER_AGENT },
      signal: requestSignal(timeoutMs),
    });
    if (robots.ok) {
      const text = await robots.text();
      if (!robotsAllowsJobsPath(text, jobsPath)) {
        return {
          ok: false,
          errorKind: "blocked",
          detail: `robots.txt disallows ${jobsPath} — company is off the table (§17.1.1)`,
        };
      }
    } else if (robots.status >= 500) {
      // Server trouble (e.g. a Workday maintenance window) says nothing about
      // permission — skip this run, retry next run. NEVER record it as a block.
      return {
        ok: false,
        errorKind: "http",
        detail: `robots.txt returned HTTP ${robots.status} — transient, retry next run`,
      };
    } else if (robots.status !== 404) {
      // A 4xx other than 404 ("no robots file") is treated as a closed door.
      return {
        ok: false,
        errorKind: "blocked",
        detail: `robots.txt returned HTTP ${robots.status} — treating as a block (§17.1.1)`,
      };
    }
  } catch (error) {
    return {
      ok: false,
      errorKind: "network",
      detail: error instanceof Error ? error.message : String(error),
    };
  }

  // First page, unfaceted: also our §17.1.4 facet-discovery request.
  const first = await postJobsPage(fetchFn, sleep, jobsUrl, {}, 0, timeoutMs);
  if (first.kind !== "ok") return failureFrom(first);

  let appliedFacets: Record<string, string[]> = {};
  let page = first.page;
  let total = Number(page.total ?? 0);
  let phFaceted = false;

  if (total > FACET_TRIGGER_TOTAL) {
    const ph = findPhilippinesFacet(page.facets);
    if (ph) {
      phFaceted = true;
      // Global tenant with a PH facet: restart faceted so we never bulk-pull
      // a 10,000-job worldwide feed.
      appliedFacets = { [ph.parameter]: [ph.id] };
      const faceted = await postJobsPage(fetchFn, sleep, jobsUrl, appliedFacets, 0, timeoutMs);
      if (faceted.kind !== "ok") return failureFrom(faceted);
      page = faceted.page;
      total = Number(page.total ?? 0);
    }
  }

  const jobs: unknown[] = [];
  for (;;) {
    const items = Array.isArray(page.jobPostings) ? page.jobPostings : [];
    jobs.push(...items);
    const next = jobs.length;
    if (next >= Math.min(total, MAX_POSTINGS) || items.length === 0) break;
    const outcome = await postJobsPage(
      fetchFn,
      sleep,
      jobsUrl,
      appliedFacets,
      next,
      timeoutMs,
    );
    if (outcome.kind !== "ok") return failureFrom(outcome);
    page = outcome.page;
  }

  const kept = jobs.slice(0, MAX_POSTINGS);
  try {
    const postings = normalizeWorkday(company, kept, { assumePhilippines: phFaceted });
    // Stopped short of total (cap or empty page): partial, so merge deactivates nothing.
    return kept.length < total
      ? { ok: true, postings, partial: true }
      : { ok: true, postings };
  } catch (error) {
    return {
      ok: false,
      errorKind: "http",
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}

function failureFrom(outcome: Exclude<PageOutcome, { kind: "ok" }>): FetchResult {
  switch (outcome.kind) {
    case "blocked":
      return { ok: false, errorKind: "blocked", detail: outcome.detail };
    case "http":
      return { ok: false, errorKind: "http", detail: `HTTP ${outcome.status}` };
    case "network":
      return { ok: false, errorKind: "network", detail: outcome.message };
  }
}
