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
    JSON.stringify({ version: 1, updatedAt: "2026-06-11T01:34:15.640Z", listings }),
  );
}

describe("parseListingsFile", () => {
  it("accepts a valid file", () => {
    const parsed = parseListingsFile(file([listing()]));
    expect(parsed.version).toBe(1);
    expect(parsed.updatedAt).toBe("2026-06-11T01:34:15.640Z");
    expect(parsed.listings).toHaveLength(1);
    expect(parsed.listings[0].title).toBe("Software Engineering Intern");
  });

  it("accepts a string salary", () => {
    const parsed = parseListingsFile(file([listing({ salary: "₱25K – ₱30K • Monthly" })]));
    expect(parsed.listings[0].salary).toBe("₱25K – ₱30K • Monthly");
  });

  it("rejects non-object input", () => {
    expect(() => parseListingsFile(null)).toThrow(/invalid/);
    expect(() => parseListingsFile("[]")).toThrow(/invalid/);
  });

  it("rejects a wrong version", () => {
    const bad = { ...(file([listing()]) as object), version: 2 };
    expect(() => parseListingsFile(bad)).toThrow(/version/);
  });

  it("rejects a missing or unparseable updatedAt", () => {
    expect(() => parseListingsFile({ version: 1, listings: [] })).toThrow(/updatedAt/);
    expect(() =>
      parseListingsFile({ version: 1, updatedAt: "not a date", listings: [] }),
    ).toThrow(/updatedAt/);
  });

  it("rejects listings that are not an array", () => {
    expect(() =>
      parseListingsFile({ version: 1, updatedAt: "2026-06-11T00:00:00Z", listings: {} }),
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
    expect(() =>
      parseListingsFile(file([listing({ datePosted: "yesterday" })])),
    ).toThrow(/datePosted/);
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
      url: "https://boards.greenhouse.io/xendit/jobs/123",
      posted: "2026-06-01",
    });
    // No forbidden/unused fields leak through (id, source, dateUpdated, active…).
    expect(Object.keys(job).sort()).toEqual([
      "company",
      "function",
      "level",
      "locations",
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
        listing({ company: "Beta", url: "https://x.co/1", datePosted: "2026-05-01T00:00:00Z" }),
        listing({ company: "Alpha", url: "https://x.co/2", datePosted: "2026-06-01T00:00:00Z" }),
        listing({ company: "Alpha", url: "https://x.co/3", datePosted: "2026-05-01T00:00:00Z" }),
      ]),
    );
    const { jobs } = toJobs(parsed);
    expect(jobs.map((j) => [j.company, j.posted])).toEqual([
      ["Alpha", "2026-06-01"],
      ["Alpha", "2026-05-01"],
      ["Beta", "2026-05-01"],
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
