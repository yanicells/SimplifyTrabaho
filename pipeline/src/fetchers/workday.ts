import { normalizeWorkday, parseWorkdaySlug } from "../normalize.js";
import type { FetchResult, RegistryCompany } from "../types.js";
import { USER_AGENT, type HttpDeps } from "./http.js";

export { parseWorkdaySlug };

// Workday adapter — Tier B (SPEC §17). Every rule below is a guardrail, not an
// optimization: robots.txt gate before the first byte, instant PERMANENT stop on
// any block signal (401/403/422/429 or a non-JSON bot-challenge page — the caller
// records the block and skips the tenant on all future runs), ≥2s politeness,
// sequential pagination with a hard cap, jobs-list endpoint ONLY (job detail
// pages carry JD text and multiply request volume — never fetch them).
// NEVER add retries, UA changes, or any block-evasion here. A closed door means no.

const POLITENESS_GAP_MS = 2000; // stricter than the ≥1s Tier-A rule (§17.1.3)
const PAGE_SIZE = 20; // the page's own request size
const MAX_POSTINGS = 1000; // §17.1.3 pagination cap
/** Above this total we look for a Philippines facet instead of bulk-pulling (§17.1.4). */
const FACET_TRIGGER_TOTAL = 500;

const realSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Minimal robots.txt check for our jobs path. Conservative: we only look at the
 * `*` group and any group naming us, and we block on any Disallow rule whose
 * prefix matches the CXS jobs path or the whole site.
 */
export function robotsAllowsJobsPath(robotsTxt: string, jobsPath: string): boolean {
  const lines = robotsTxt.split(/\r?\n/);
  let applies = false;
  const disallows: string[] = [];
  for (const raw of lines) {
    const line = raw.replace(/#.*$/, "").trim();
    if (line === "") continue;
    const [field = "", ...rest] = line.split(":");
    const value = rest.join(":").trim();
    switch (field.trim().toLowerCase()) {
      case "user-agent":
        applies = value === "*" || value.toLowerCase().includes("simplifytrabaho");
        break;
      case "disallow":
        if (applies && value !== "") disallows.push(value);
        break;
      default:
        break;
    }
  }
  return !disallows.some((rule) => jobsPath.startsWith(rule.replace(/\*$/, "")));
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
    });
    if (BLOCK_STATUSES.has(response.status)) {
      return { kind: "blocked", detail: `HTTP ${response.status} — permanent stop (§17.1.2)` };
    }
    if (!response.ok) return { kind: "http", status: response.status };
    try {
      return { kind: "ok", page: (await response.json()) as WorkdayPage };
    } catch {
      return {
        kind: "blocked",
        detail: "non-JSON response (bot challenge?) — permanent stop (§17.1.2)",
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
    } else if (robots.status !== 404) {
      // Anything but "no robots file" is treated as a closed door.
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
  const first = await postJobsPage(fetchFn, sleep, jobsUrl, {}, 0);
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
      const faceted = await postJobsPage(fetchFn, sleep, jobsUrl, appliedFacets, 0);
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
    const outcome = await postJobsPage(fetchFn, sleep, jobsUrl, appliedFacets, next);
    if (outcome.kind !== "ok") return failureFrom(outcome);
    page = outcome.page;
  }

  try {
    return {
      ok: true,
      postings: normalizeWorkday(company, jobs.slice(0, MAX_POSTINGS), {
        assumePhilippines: phFaceted,
      }),
    };
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
