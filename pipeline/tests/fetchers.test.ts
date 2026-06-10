import { describe, expect, it } from "vitest";
import { fetchGreenhouse } from "../src/fetchers/greenhouse.js";
import { fetchLever } from "../src/fetchers/lever.js";
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
