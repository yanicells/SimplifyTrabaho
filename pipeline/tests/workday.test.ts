import { describe, expect, it } from "vitest";
import { fetchWorkday, parseWorkdaySlug } from "../src/fetchers/workday.js";
import { normalizeWorkday } from "../src/normalize.js";
import type { RegistryCompany } from "../src/types.js";

// Workday is Tier B (SPEC §17): every guardrail here is a legal requirement,
// not a nicety. robots.txt gate, instant permanent stop on any block, ≥2s
// politeness, pagination cap, jobs-list only.

const COMPANY: RegistryCompany = {
  name: "Globe",
  ats: "workday",
  slug: "globe.wd3/GLB_Careers",
  industry: "telecom",
  type: "direct",
  verified: true,
  added: "2026-07-06",
};

const JOB = {
  title: "Network Engineer",
  externalPath: "/job/Taguig-City/Network-Engineer_JR-1001",
  locationsText: "Taguig City",
  postedOn: "Posted 3 Days Ago",
  bulletFields: ["JR-1001"],
  timeType: "Full time",
};

function jobsPage(total: number, count: number, facets: unknown[] = []) {
  return {
    total,
    jobPostings: Array.from({ length: count }, (_, i) => ({
      ...JOB,
      externalPath: `/job/Taguig-City/Role-${i}`,
      title: `Role ${i}`,
    })),
    facets,
  };
}

interface Call {
  url: string;
  method: string;
  body: unknown;
}

/** Fake HTTP: robots.txt response + a handler for each sequential jobs POST. */
function fakeHttp(
  robots: { status: number; text: string } | "network",
  jobsResponses: Array<{ status: number; json?: unknown; html?: boolean }>,
) {
  const calls: Call[] = [];
  const sleeps: number[] = [];
  let posts = 0;
  const fetchFn = (async (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
    const url = String(input);
    calls.push({
      url,
      method: init?.method ?? "GET",
      body: init?.body !== undefined ? JSON.parse(String(init.body)) : undefined,
    });
    if (url.endsWith("/robots.txt")) {
      if (robots === "network") throw new Error("connect ETIMEDOUT");
      return new Response(robots.text, { status: robots.status });
    }
    const spec = jobsResponses[Math.min(posts, jobsResponses.length - 1)] ?? { status: 500 };
    posts += 1;
    if (spec.html) return new Response("<html>challenge</html>", { status: spec.status });
    return new Response(JSON.stringify(spec.json ?? {}), { status: spec.status });
  }) as typeof fetch;
  const sleep = async (ms: number) => {
    sleeps.push(ms);
  };
  return { fetchFn, sleep, calls, sleeps };
}

describe("parseWorkdaySlug", () => {
  it("splits tenant.wdN/site into host, tenant, and site", () => {
    expect(parseWorkdaySlug("globe.wd3/GLB_Careers")).toEqual({
      tenant: "globe",
      host: "globe.wd3.myworkdayjobs.com",
      site: "GLB_Careers",
    });
  });

  it("rejects malformed slugs", () => {
    for (const bad of ["globe", "globe/site", "globe.wd3", "a.wd3/b/c", ""]) {
      expect(() => parseWorkdaySlug(bad)).toThrow(/workday slug/);
    }
  });
});

describe("fetchWorkday — robots.txt gate (guardrail §17.1.1)", () => {
  it("checks robots.txt before anything else and stops when the jobs path is disallowed", async () => {
    const http = fakeHttp(
      { status: 200, text: "User-agent: *\nDisallow: /wday/" },
      [{ status: 200, json: jobsPage(1, 1) }],
    );
    const result = await fetchWorkday(COMPANY, http);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errorKind).toBe("blocked");
    // Only the robots.txt request went out — never the jobs POST.
    expect(http.calls).toHaveLength(1);
    expect(http.calls[0]?.url).toBe("https://globe.wd3.myworkdayjobs.com/robots.txt");
  });

  it("treats Disallow: / as a full block", async () => {
    const http = fakeHttp({ status: 200, text: "User-agent: *\nDisallow: /" }, []);
    const result = await fetchWorkday(COMPANY, http);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errorKind).toBe("blocked");
  });

  it("proceeds when robots.txt is missing (404) or allows the path", async () => {
    for (const robots of [
      { status: 404, text: "" },
      { status: 200, text: "User-agent: *\nDisallow: /admin/" },
      { status: 200, text: "" },
    ]) {
      const http = fakeHttp(robots, [{ status: 200, json: jobsPage(1, 1) }]);
      const result = await fetchWorkday(COMPANY, http);
      expect(result.ok).toBe(true);
    }
  });

  it("treats a non-404 robots.txt error status as a block (conservative)", async () => {
    const http = fakeHttp({ status: 403, text: "denied" }, []);
    const result = await fetchWorkday(COMPANY, http);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errorKind).toBe("blocked");
    expect(http.calls).toHaveLength(1);
  });
});

describe("fetchWorkday — stop on block, never retry (guardrail §17.1.2)", () => {
  it.each([401, 403, 422, 429])("status %i → blocked after exactly one attempt", async (status) => {
    const http = fakeHttp({ status: 404, text: "" }, [{ status, json: {} }]);
    const result = await fetchWorkday(COMPANY, http);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errorKind).toBe("blocked");
    // robots + ONE jobs attempt, zero retries.
    expect(http.calls).toHaveLength(2);
  });

  it("a non-JSON response (bot-challenge page) → blocked", async () => {
    const http = fakeHttp({ status: 404, text: "" }, [{ status: 200, html: true }]);
    const result = await fetchWorkday(COMPANY, http);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errorKind).toBe("blocked");
  });

  it("a 500 is a plain http failure (not a block), still no retry", async () => {
    const http = fakeHttp({ status: 404, text: "" }, [{ status: 500, json: {} }]);
    const result = await fetchWorkday(COMPANY, http);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errorKind).toBe("http");
    expect(http.calls).toHaveLength(2);
  });
});

describe("fetchWorkday — politeness ≥2s (guardrail §17.1.3)", () => {
  it("sleeps 2000ms before every request including robots.txt", async () => {
    const http = fakeHttp({ status: 404, text: "" }, [
      { status: 200, json: jobsPage(25, 20) },
      { status: 200, json: jobsPage(25, 5) },
    ]);
    await fetchWorkday(COMPANY, http);
    // robots + 2 pages = 3 requests, 3 politeness gaps, all ≥2000.
    expect(http.sleeps).toHaveLength(3);
    for (const ms of http.sleeps) expect(ms).toBeGreaterThanOrEqual(2000);
  });
});

describe("fetchWorkday — pagination + cap (guardrail §17.1.3)", () => {
  it("pages by offset until total", async () => {
    const http = fakeHttp({ status: 404, text: "" }, [
      { status: 200, json: jobsPage(45, 20) },
      { status: 200, json: jobsPage(45, 20) },
      { status: 200, json: jobsPage(45, 5) },
    ]);
    const result = await fetchWorkday(COMPANY, http);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.postings).toHaveLength(45);
    const posts = http.calls.filter((c) => c.method === "POST");
    expect(posts.map((c) => (c.body as { offset: number }).offset)).toEqual([0, 20, 40]);
  });

  it("stops at 1,000 postings on an unfaceted global tenant", async () => {
    const http = fakeHttp({ status: 404, text: "" }, [
      { status: 200, json: jobsPage(5000, 20) },
    ]);
    const result = await fetchWorkday(COMPANY, http);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.postings).toHaveLength(1000);
    expect(http.calls.filter((c) => c.method === "POST")).toHaveLength(50);
  });
});

describe("fetchWorkday — PH facet at the source (guardrail §17.1.4)", () => {
  it("re-queries with the Philippines facet when a big tenant advertises one", async () => {
    const facets = [
      {
        facetParameter: "locationCountry",
        values: [
          { descriptor: "United States of America", id: "us-guid", count: 4000 },
          { descriptor: "Philippines", id: "ph-guid", count: 30 },
        ],
      },
    ];
    const http = fakeHttp({ status: 404, text: "" }, [
      { status: 200, json: jobsPage(5000, 20, facets) }, // discovery page
      { status: 200, json: jobsPage(30, 20) }, // faceted page 1
      { status: 200, json: jobsPage(30, 10) }, // faceted page 2
    ]);
    const result = await fetchWorkday(COMPANY, http);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.postings).toHaveLength(30);
    const posts = http.calls.filter((c) => c.method === "POST");
    expect(posts).toHaveLength(3);
    expect((posts[0]?.body as { appliedFacets: object }).appliedFacets).toEqual({});
    expect((posts[1]?.body as { appliedFacets: object }).appliedFacets).toEqual({
      locationCountry: ["ph-guid"],
    });
  });

  it("finds the Philippines inside a nested facet group (Accenture locationMainGroup > Country)", async () => {
    const facets = [
      {
        facetParameter: "locationMainGroup",
        values: [
          {
            facetParameter: "locationCountry",
            descriptor: "Country",
            values: [
              { descriptor: "Argentina", id: "ar-guid", count: 175 },
              { descriptor: "Philippines", id: "ph-guid", count: 671 },
            ],
          },
        ],
      },
    ];
    const http = fakeHttp({ status: 404, text: "" }, [
      { status: 200, json: jobsPage(2000, 20, facets) },
      { status: 200, json: jobsPage(25, 20) },
      { status: 200, json: jobsPage(25, 5) },
    ]);
    const result = await fetchWorkday(COMPANY, http);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.postings).toHaveLength(25);
    const posts = http.calls.filter((c) => c.method === "POST");
    expect((posts[1]?.body as { appliedFacets: object }).appliedFacets).toEqual({
      locationCountry: ["ph-guid"],
    });
  });

  it("stamps Philippines as the location when PH-faceted items omit locationsText", async () => {
    // Real Accenture behavior: country-faceted items carry no locationsText.
    // The facet itself is the location fact — Workday returned these under the
    // Philippines country facet.
    const facets = [
      {
        facetParameter: "locationCountry",
        values: [{ descriptor: "Philippines", id: "ph-guid", count: 2 }],
      },
    ];
    const bare = { title: "ETL Developer", externalPath: "/job/x/ETL_1" };
    const http = fakeHttp({ status: 404, text: "" }, [
      { status: 200, json: jobsPage(600, 20, facets) },
      { status: 200, json: { total: 1, jobPostings: [bare], facets: [] } },
    ]);
    const result = await fetchWorkday(COMPANY, http);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.postings[0]?.locations).toEqual(["Philippines"]);
  });

  it("small tenants are fetched whole with no facet round-trip", async () => {
    const http = fakeHttp({ status: 404, text: "" }, [
      { status: 200, json: jobsPage(45, 20) },
      { status: 200, json: jobsPage(45, 20) },
      { status: 200, json: jobsPage(45, 5) },
    ]);
    const result = await fetchWorkday(COMPANY, http);
    expect(result.ok).toBe(true);
    expect(http.calls.filter((c) => c.method === "POST")).toHaveLength(3);
  });
});

describe("normalizeWorkday", () => {
  it("maps facts only: title, location, constructed apply URL; no JD text anywhere", () => {
    const postings = normalizeWorkday(COMPANY, [JOB]);
    expect(postings).toEqual([
      {
        company: "Globe",
        source: "workday",
        title: "Network Engineer",
        locations: ["Taguig City"],
        url: "https://globe.wd3.myworkdayjobs.com/en-US/GLB_Careers/job/Taguig-City/Network-Engineer_JR-1001",
        workSetup: "unknown",
        employmentType: "full-time",
        salary: null,
        publishedAt: null,
        industry: "telecom",
        companyType: "direct",
      },
    ]);
  });

  it("tolerates missing optional fields", () => {
    const postings = normalizeWorkday(COMPANY, [
      { title: "Analyst", externalPath: "/job/x/Analyst_1" },
    ]);
    expect(postings[0]?.locations).toEqual([]);
    expect(postings[0]?.employmentType).toBe("unknown");
  });
});
