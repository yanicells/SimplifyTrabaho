import { describe, expect, it } from "vitest";
import { computeCoverage, formatCoverageReport } from "../src/coverage.js";
import type { Listing } from "../src/types.js";

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
    metro: ["ncr"],
    url: "https://example.com/jobs/1",
    source: "greenhouse",
    employmentType: "internship",
    salary: null,
    datePosted: "2026-06-01T00:00:00.000Z",
    dateUpdated: "2026-06-10T00:00:00.000Z",
    active: true,
    ...overrides,
  };
}

describe("computeCoverage", () => {
  it("re-runs the current tables over active titles only", () => {
    const report = computeCoverage([
      listing({ title: "Senior Software Engineer" }), // known/known
      listing({ title: "PHP Developer" }), // unknown level, known function
      listing({ title: "GBS Specialist" }), // unknown level, other function
      listing({ title: "GBS Specialist", active: false }), // inactive — excluded
    ]);
    expect(report.active).toBe(3);
    expect(report.levelKnown).toBe(1);
    expect(report.levelUnknown).toBe(2);
    expect(report.functionKnown).toBe(2);
    expect(report.functionOther).toBe(1);
  });

  it("measures the tables as code, not the stored categories", () => {
    // Stored function says other, but the v2 tables map "Cashier" → retail.
    const report = computeCoverage([listing({ title: "Cashier", function: "other" })]);
    expect(report.functionOther).toBe(0);
  });

  it("ranks uncategorized titles by frequency, ties alphabetical, capped", () => {
    const report = computeCoverage(
      [
        ...Array.from({ length: 3 }, (_, i) =>
          listing({ title: "GBS Specialist", url: `https://x.co/g${i}` }),
        ),
        listing({ title: "Solutions Expert", url: "https://x.co/s1" }),
        listing({ title: "Area Manager", url: "https://x.co/a1" }),
      ],
      { topN: 2 },
    );
    expect(report.topFunctionOther).toEqual([
      { title: "GBS Specialist", count: 3 },
      { title: "Area Manager", count: 1 },
    ]);
    expect(report.topLevelUnknown[0]).toEqual({ title: "GBS Specialist", count: 3 });
  });

  it("trims whitespace when grouping titles (real feeds pad them)", () => {
    const report = computeCoverage([
      listing({ title: " GBS Specialist", url: "https://x.co/1" }),
      listing({ title: "GBS Specialist ", url: "https://x.co/2" }),
    ]);
    expect(report.topFunctionOther).toEqual([{ title: "GBS Specialist", count: 2 }]);
  });
});

describe("formatCoverageReport", () => {
  it("prints percentages and the top lists", () => {
    const text = formatCoverageReport(
      computeCoverage([
        listing({ title: "Senior Software Engineer" }),
        listing({ title: "GBS Specialist" }),
      ]),
    );
    expect(text).toContain("level known: 1/2 (50.0%) · unknown 1 (50.0%)");
    expect(text).toContain("function known: 1/2 (50.0%) · other 1 (50.0%)");
    expect(text).toContain("GBS Specialist");
  });

  it("handles an empty dataset without dividing by zero", () => {
    const text = formatCoverageReport(computeCoverage([]));
    expect(text).toContain("0/0");
  });
});
