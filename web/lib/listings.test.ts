import { describe, expect, it } from "vitest";
import type { Listing } from "../../pipeline/src/types";
import { parseListingsFile, timeAgo, toJobs } from "./listings";

function listing(overrides: Partial<Listing> = {}): Listing {
  return {
    id: "abc123def456",
    company: "Xendit",
    title: "Software Engineering Intern",
    locations: ["Manila, Philippines"],
    workSetup: "hybrid",
    level: "internship",
    function: "engineering",
    industry: "fintech",
    companyType: "direct",
    metro: ["ncr"],
    url: "https://boards.greenhouse.io/xendit/jobs/123",
    source: "greenhouse",
    employmentType: "internship",
    salary: null,
    datePosted: "2026-06-01T00:00:00.000Z",
    dateUpdated: "2026-06-10T00:00:00.000Z",
    active: true,
    ...overrides,
  };
}

function file(listings: Listing[]): unknown {
  // Round-trip through JSON so the input is plain parsed data, like at build time.
  return JSON.parse(
    JSON.stringify({ version: 3, updatedAt: "2026-06-11T01:34:15.640Z", listings }),
  );
}

describe("parseListingsFile", () => {
  it("accepts a valid v3 file", () => {
    const parsed = parseListingsFile(file([listing()]));
    expect(parsed.version).toBe(3);
    expect(parsed.updatedAt).toBe("2026-06-11T01:34:15.640Z");
    expect(parsed.listings).toHaveLength(1);
    expect(parsed.listings[0].title).toBe("Software Engineering Intern");
    expect(parsed.listings[0].industry).toBe("fintech");
    expect(parsed.listings[0].companyType).toBe("direct");
    expect(parsed.listings[0].metro).toEqual(["ncr"]);
  });

  it("accepts the schema-v3 sources and agency companyType", () => {
    const parsed = parseListingsFile(
      file([
        listing({ source: "bamboohr", companyType: "agency" }),
        listing({ source: "breezy", url: "https://x.co/2" }),
        listing({ source: "manatal", url: "https://x.co/3" }),
      ]),
    );
    expect(parsed.listings.map((l) => l.source)).toEqual(["bamboohr", "breezy", "manatal"]);
    expect(parsed.listings[0].companyType).toBe("agency");
  });

  it("rejects a missing or invalid companyType", () => {
    const missing = file([listing()]) as { listings: Record<string, unknown>[] };
    delete missing.listings[0].companyType;
    expect(() => parseListingsFile(missing)).toThrow(/companyType/);
    expect(() =>
      parseListingsFile(
        file([listing({ companyType: "franchise" as Listing["companyType"] })]),
      ),
    ).toThrow(/companyType/);
  });

  it("accepts all 18 schema-v2 function values", () => {
    const fns = [
      "healthcare",
      "education",
      "hospitality",
      "manufacturing",
      "retail",
      "construction",
    ] as const;
    const parsed = parseListingsFile(
      file(fns.map((fn, i) => listing({ function: fn, url: `https://x.co/${i}` }))),
    );
    expect(parsed.listings.map((l) => l.function)).toEqual([...fns]);
  });

  it("accepts a string salary", () => {
    const parsed = parseListingsFile(file([listing({ salary: "₱25K – ₱30K • Monthly" })]));
    expect(parsed.listings[0].salary).toBe("₱25K – ₱30K • Monthly");
  });

  it("rejects non-object input", () => {
    expect(() => parseListingsFile(null)).toThrow(/invalid/);
    expect(() => parseListingsFile("[]")).toThrow(/invalid/);
  });

  it("rejects a wrong version, including pre-migration v1 and v2", () => {
    for (const version of [1, 2]) {
      const bad = { ...(file([listing()]) as object), version };
      expect(() => parseListingsFile(bad)).toThrow(/version/);
    }
  });

  it("rejects a non-string industry", () => {
    expect(() =>
      parseListingsFile(file([listing({ industry: 42 as unknown as string })])),
    ).toThrow(/industry/);
  });

  it("rejects unknown metro tags and non-array metro", () => {
    expect(() => parseListingsFile(file([listing({ metro: ["atlantis"] })]))).toThrow(/metro/);
    expect(() =>
      parseListingsFile(file([listing({ metro: "ncr" as unknown as string[] })])),
    ).toThrow(/metro/);
  });

  it("rejects a missing or unparseable updatedAt", () => {
    expect(() => parseListingsFile({ version: 3, listings: [] })).toThrow(/updatedAt/);
    expect(() =>
      parseListingsFile({ version: 3, updatedAt: "not a date", listings: [] }),
    ).toThrow(/updatedAt/);
  });

  it("rejects listings that are not an array", () => {
    expect(() =>
      parseListingsFile({ version: 3, updatedAt: "2026-06-11T00:00:00Z", listings: {} }),
    ).toThrow(/listings/);
  });

  it("rejects a listing missing a required string field", () => {
    const bad = file([listing()]) as { listings: Record<string, unknown>[] };
    delete bad.listings[0].title;
    expect(() => parseListingsFile(bad)).toThrow(/title/);
  });

  it("rejects an empty url", () => {
    expect(() => parseListingsFile(file([listing({ url: "" })]))).toThrow(/url/);
  });

  it("rejects a bad enum value and names the field and index", () => {
    const bad = file([listing(), listing({ level: "boss" as Listing["level"] })]);
    expect(() => parseListingsFile(bad)).toThrow(/listings\[1\]\.level/);
  });

  it("rejects non-string-array locations", () => {
    expect(() =>
      parseListingsFile(file([listing({ locations: "Manila" as unknown as string[] })])),
    ).toThrow(/locations/);
    expect(() =>
      parseListingsFile(file([listing({ locations: [42] as unknown as string[] })])),
    ).toThrow(/locations/);
  });

  it("rejects a numeric salary", () => {
    expect(() =>
      parseListingsFile(file([listing({ salary: 50000 as unknown as string })])),
    ).toThrow(/salary/);
  });

  it("rejects a non-boolean active flag", () => {
    expect(() =>
      parseListingsFile(file([listing({ active: "yes" as unknown as boolean })])),
    ).toThrow(/active/);
  });

  it("rejects an unparseable datePosted", () => {
    expect(() => parseListingsFile(file([listing({ datePosted: "yesterday" })]))).toThrow(
      /datePosted/,
    );
  });
});

describe("toJobs", () => {
  it("drops inactive listings", () => {
    const parsed = parseListingsFile(
      file([listing(), listing({ id: "ffffffffffff", url: "https://x.co/2", active: false })]),
    );
    expect(toJobs(parsed).jobs).toHaveLength(1);
  });

  it("ships only the fields the UI uses, with day-precision posted", () => {
    const parsed = parseListingsFile(file([listing()]));
    const job = toJobs(parsed).jobs[0];
    expect(job).toEqual({
      company: "Xendit",
      title: "Software Engineering Intern",
      locations: ["Manila, Philippines"],
      workSetup: "hybrid",
      level: "internship",
      function: "engineering",
      industry: "fintech",
      companyType: "direct",
      metro: ["ncr"],
      url: "https://boards.greenhouse.io/xendit/jobs/123",
      posted: "2026-06-01",
    });
    // No forbidden/unused fields leak through (id, source, dateUpdated, active…).
    expect(Object.keys(job).sort()).toEqual([
      "company",
      "companyType",
      "function",
      "industry",
      "level",
      "locations",
      "metro",
      "posted",
      "title",
      "url",
      "workSetup",
    ]);
  });

  it("includes salary only when published", () => {
    const parsed = parseListingsFile(
      file([
        listing({ salary: "₱30,000 - ₱40,000" }),
        listing({ id: "ffffffffffff", url: "https://x.co/2", salary: null }),
      ]),
    );
    const { jobs } = toJobs(parsed);
    expect(jobs[0].salary).toBe("₱30,000 - ₱40,000");
    expect("salary" in jobs[1]).toBe(false);
  });

  it("sorts newest first, then company asc", () => {
    const parsed = parseListingsFile(
      file([
        listing({
          company: "Beta",
          url: "https://x.co/1",
          datePosted: "2026-05-01T00:00:00Z",
        }),
        listing({
          company: "Alpha",
          url: "https://x.co/2",
          datePosted: "2026-06-01T00:00:00Z",
        }),
        listing({
          company: "Alpha",
          url: "https://x.co/3",
          datePosted: "2026-05-01T00:00:00Z",
        }),
      ]),
    );
    const { jobs } = toJobs(parsed);
    expect(jobs.map((j) => [j.company, j.posted])).toEqual([
      ["Alpha", "2026-06-01"],
      ["Alpha", "2026-05-01"],
      ["Beta", "2026-05-01"],
    ]);
  });

  it("interleaves companies within a same-day bucket (no long single-company runs)", () => {
    const parsed = parseListingsFile(
      file([
        listing({
          company: "Accenture",
          url: "https://x.co/a1",
          datePosted: "2026-07-06T00:00:00Z",
        }),
        listing({
          company: "Accenture",
          url: "https://x.co/a2",
          datePosted: "2026-07-06T00:00:00Z",
        }),
        listing({
          company: "Accenture",
          url: "https://x.co/a3",
          datePosted: "2026-07-06T00:00:00Z",
        }),
        listing({
          company: "GCash",
          url: "https://x.co/g1",
          datePosted: "2026-07-06T00:00:00Z",
        }),
        listing({
          company: "Xendit",
          url: "https://x.co/x1",
          datePosted: "2026-07-06T00:00:00Z",
        }),
      ]),
    );
    expect(toJobs(parsed).jobs.map((j) => j.company)).toEqual([
      "Accenture",
      "GCash",
      "Xendit",
      "Accenture",
      "Accenture",
    ]);
  });

  it("orders Philippine locations first for multi-country roles", () => {
    const parsed = parseListingsFile(
      file([
        listing({
          locations: ["Cape Town, South Africa", "Cairo, Egypt", "Davao City, Philippines"],
        }),
      ]),
    );
    expect(toJobs(parsed).jobs[0].locations).toEqual([
      "Davao City, Philippines",
      "Cape Town, South Africa",
      "Cairo, Egypt",
    ]);
  });

  it("passes updatedAt through", () => {
    const parsed = parseListingsFile(file([listing()]));
    expect(toJobs(parsed).updatedAt).toBe("2026-06-11T01:34:15.640Z");
  });
});

describe("timeAgo", () => {
  const ref = "2026-06-11T01:34:15.640Z";

  it("says today for same-day and future dates", () => {
    expect(timeAgo("2026-06-11", ref)).toBe("today");
    expect(timeAgo("2026-06-12", ref)).toBe("today");
  });

  it("counts days", () => {
    expect(timeAgo("2026-06-10", ref)).toBe("1d ago");
    expect(timeAgo("2026-05-30", ref)).toBe("12d ago");
  });

  it("switches to months at 30 days", () => {
    expect(timeAgo("2026-05-12", ref)).toBe("1mo ago");
    expect(timeAgo("2026-03-23", ref)).toBe("2mo ago");
  });

  it("switches to years at 365 days", () => {
    expect(timeAgo("2025-05-01", ref)).toBe("1y ago");
  });
});
