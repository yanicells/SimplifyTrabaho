import { describe, expect, it } from "vitest";
import { fetchAshby } from "../src/fetchers/ashby.js";
import { fetchGreenhouse } from "../src/fetchers/greenhouse.js";
import { fetchLever } from "../src/fetchers/lever.js";
import { fetchRecruitee } from "../src/fetchers/recruitee.js";
import { fetchSmartRecruiters } from "../src/fetchers/smartrecruiters.js";
import { fetchWorkable } from "../src/fetchers/workable.js";
import { USER_AGENT } from "../src/fetchers/http.js";
import type { RegistryCompany } from "../src/types.js";

const xendit: RegistryCompany = {
  name: "Xendit",
  ats: "greenhouse",
  slug: "xendit",
  industry: "fintech",
  verified: true,
  added: "2026-06-11",
};

const ninjaVan: RegistryCompany = {
  name: "Ninja Van",
  ats: "lever",
  slug: "ninjavan",
  industry: "logistics",
  verified: true,
  added: "2026-06-11",
};

const GH_BODY = {
  jobs: [
    {
      title: "Risk Operations Analyst",
      absolute_url: "https://example.com/jobs/1",
      location: { name: "Manila, Philippines" },
      first_published: "2026-04-10T07:41:32-04:00",
    },
  ],
};

interface Call {
  url: string;
  headers: Record<string, string>;
}

function fakeHttp(responses: Array<{ status: number; body?: unknown } | Error>) {
  const calls: Call[] = [];
  const sleeps: number[] = [];
  let i = 0;
  const fetchFn = (async (url: unknown, init?: { headers?: Record<string, string> }) => {
    calls.push({ url: String(url), headers: init?.headers ?? {} });
    const next = responses[Math.min(i, responses.length - 1)]!;
    i += 1;
    if (next instanceof Error) throw next;
    return {
      status: next.status,
      ok: next.status >= 200 && next.status < 300,
      json: async () => next.body,
    };
  }) as unknown as typeof fetch;
  const sleep = async (ms: number) => {
    sleeps.push(ms);
  };
  return { fetchFn, sleep, calls, sleeps };
}

describe("fetchGreenhouse", () => {
  it("hits the documented endpoint with the identifying User-Agent", async () => {
    const http = fakeHttp([{ status: 200, body: GH_BODY }]);
    await fetchGreenhouse(xendit, http);
    expect(http.calls[0]!.url).toBe("https://boards-api.greenhouse.io/v1/boards/xendit/jobs");
    expect(http.calls[0]!.headers["User-Agent"]).toBe(USER_AGENT);
    expect(USER_AGENT).toMatch(/^simplifytrabaho\/[\d.]+ \(\+https:\/\/github\.com\//);
  });

  it("waits politely before every request", async () => {
    const http = fakeHttp([{ status: 200, body: GH_BODY }]);
    await fetchGreenhouse(xendit, http);
    expect(http.sleeps[0]).toBeGreaterThanOrEqual(1000);
  });

  it("returns normalized postings on 200", async () => {
    const http = fakeHttp([{ status: 200, body: GH_BODY }]);
    const result = await fetchGreenhouse(xendit, http);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.postings).toHaveLength(1);
      expect(result.postings[0]!.title).toBe("Risk Operations Analyst");
    }
  });

  it("reports dead-slug on 404 without retrying", async () => {
    const http = fakeHttp([{ status: 404, body: { error: "Job not found" } }]);
    const result = await fetchGreenhouse(xendit, http);
    expect(result).toMatchObject({ ok: false, errorKind: "dead-slug" });
    expect(http.calls).toHaveLength(1);
  });

  it("retries 5xx with backoff and succeeds", async () => {
    const http = fakeHttp([{ status: 503 }, { status: 503 }, { status: 200, body: GH_BODY }]);
    const result = await fetchGreenhouse(xendit, http);
    expect(result.ok).toBe(true);
    expect(http.calls).toHaveLength(3);
    // pre-request politeness sleeps plus growing backoff sleeps
    const backoffs = http.sleeps.filter((ms) => ms > 1000);
    expect(backoffs).toHaveLength(2);
    expect(backoffs[1]!).toBeGreaterThan(backoffs[0]!);
  });

  it("gives up after 3 attempts on persistent 5xx", async () => {
    const http = fakeHttp([{ status: 500 }]);
    const result = await fetchGreenhouse(xendit, http);
    expect(result).toMatchObject({ ok: false, errorKind: "http" });
    expect(http.calls).toHaveLength(3);
  });

  it("retries network errors and reports them when persistent", async () => {
    const http = fakeHttp([new Error("ECONNRESET")]);
    const result = await fetchGreenhouse(xendit, http);
    expect(result).toMatchObject({ ok: false, errorKind: "network" });
    expect(http.calls).toHaveLength(3);
  });
});

describe("fetchLever", () => {
  it("hits the documented endpoint and normalizes", async () => {
    const http = fakeHttp([
      {
        status: 200,
        body: [
          {
            text: "Employee Relations Intern",
            hostedUrl: "https://jobs.lever.co/ninjavan/abc",
            createdAt: 1777448390169,
            workplaceType: "hybrid",
            categories: {
              commitment: "Internship",
              location: "Taguig, Philippines",
              allLocations: ["Taguig, Philippines"],
            },
          },
        ],
      },
    ]);
    const result = await fetchLever(ninjaVan, http);
    expect(http.calls[0]!.url).toBe("https://api.lever.co/v0/postings/ninjavan?mode=json");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.postings[0]!).toMatchObject({
        title: "Employee Relations Intern",
        workSetup: "hybrid",
        employmentType: "internship",
      });
    }
  });

  it("reports dead-slug on 404", async () => {
    const http = fakeHttp([{ status: 404, body: { ok: false, error: "Document not found" } }]);
    const result = await fetchLever(ninjaVan, http);
    expect(result).toMatchObject({ ok: false, errorKind: "dead-slug" });
  });
});

function registryCompany(overrides: Partial<RegistryCompany>): RegistryCompany {
  return {
    name: "Test Co",
    ats: "greenhouse",
    slug: "test",
    industry: "",
    verified: true,
    added: "2026-06-11",
    ...overrides,
  };
}

describe("fetchAshby", () => {
  const deel = registryCompany({ name: "Deel", ats: "ashby", slug: "deel" });

  it("hits the documented endpoint and normalizes", async () => {
    const http = fakeHttp([
      {
        status: 200,
        body: {
          jobs: [
            {
              title: "Engineer",
              location: "Manila, Philippines",
              isListed: true,
              jobUrl: "https://jobs.ashbyhq.com/deel/x",
              publishedAt: "2026-06-01T00:00:00.000Z",
            },
          ],
        },
      },
    ]);
    const result = await fetchAshby(deel, http);
    expect(http.calls[0]!.url).toBe(
      "https://api.ashbyhq.com/posting-api/job-board/deel?includeCompensation=true",
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.postings).toHaveLength(1);
  });

  it("reports dead-slug on 404", async () => {
    const http = fakeHttp([{ status: 404 }]);
    expect(await fetchAshby(deel, http)).toMatchObject({ ok: false, errorKind: "dead-slug" });
  });
});

describe("fetchWorkable", () => {
  const crewBloom = registryCompany({ name: "CrewBloom", ats: "workable", slug: "crewbloom" });

  it("hits the documented endpoint and normalizes", async () => {
    const http = fakeHttp([
      {
        status: 200,
        body: {
          name: "CrewBloom",
          jobs: [{ title: "VA", url: "https://apply.workable.com/j/X", telecommuting: true }],
        },
      },
    ]);
    const result = await fetchWorkable(crewBloom, http);
    expect(http.calls[0]!.url).toBe(
      "https://apply.workable.com/api/v1/widget/accounts/crewbloom",
    );
    expect(result.ok).toBe(true);
  });

  it("treats a live account with zero jobs as a successful empty fetch", async () => {
    const http = fakeHttp([{ status: 200, body: { name: "PenBrothers", jobs: [] } }]);
    const result = await fetchWorkable(crewBloom, http);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.postings).toHaveLength(0);
  });

  it("reports dead-slug on 404", async () => {
    const http = fakeHttp([{ status: 404 }]);
    expect(await fetchWorkable(crewBloom, http)).toMatchObject({
      ok: false,
      errorKind: "dead-slug",
    });
  });
});

describe("fetchSmartRecruiters", () => {
  const canva = registryCompany({ name: "Canva", ats: "smartrecruiters", slug: "Canva" });

  const srPosting = (id: string) => ({
    id,
    name: `Role ${id}`,
    releasedDate: "2026-06-01T00:00:00.000Z",
    location: {
      city: "Manila",
      country: "ph",
      remote: false,
      hybrid: false,
      fullLocation: "Manila, Philippines",
    },
  });

  it("paginates with offset until totalFound is reached", async () => {
    const page = (offset: number, n: number, total: number) => ({
      status: 200,
      body: {
        offset,
        limit: 100,
        totalFound: total,
        content: Array.from({ length: n }, (_, i) => srPosting(`${offset + i}`)),
      },
    });
    const http = fakeHttp([page(0, 100, 250), page(100, 100, 250), page(200, 50, 250)]);
    const result = await fetchSmartRecruiters(canva, http);
    expect(http.calls.map((c) => c.url)).toEqual([
      "https://api.smartrecruiters.com/v1/companies/Canva/postings?limit=100&offset=0",
      "https://api.smartrecruiters.com/v1/companies/Canva/postings?limit=100&offset=100",
      "https://api.smartrecruiters.com/v1/companies/Canva/postings?limit=100&offset=200",
    ]);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.postings).toHaveLength(250);
  });

  it("treats an empty company as a dead slug (SR returns 200 for unknown companies)", async () => {
    const http = fakeHttp([
      { status: 200, body: { offset: 0, limit: 100, totalFound: 0, content: [] } },
    ]);
    expect(await fetchSmartRecruiters(canva, http)).toMatchObject({
      ok: false,
      errorKind: "dead-slug",
    });
  });
});

describe("fetchRecruitee", () => {
  const hostaway = registryCompany({ name: "Hostaway", ats: "recruitee", slug: "hostaway" });

  it("hits the documented endpoint and normalizes", async () => {
    const http = fakeHttp([
      {
        status: 200,
        body: {
          offers: [
            {
              title: "Engineer",
              careers_url: "https://careers.hostaway.com/o/engineer",
              remote: true,
              published_at: "2026-06-01 08:00:00 UTC",
            },
          ],
        },
      },
    ]);
    const result = await fetchRecruitee(hostaway, http);
    expect(http.calls[0]!.url).toBe("https://hostaway.recruitee.com/api/offers/");
    expect(result.ok).toBe(true);
  });

  it("reports dead-slug on 404", async () => {
    const http = fakeHttp([{ status: 404 }]);
    expect(await fetchRecruitee(hostaway, http)).toMatchObject({
      ok: false,
      errorKind: "dead-slug",
    });
  });
});
