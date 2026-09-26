import { describe, expect, it } from "vitest";
import { filterJobs } from "./filter-jobs";
import { defaultFilters, type Filters } from "./filter-params";
import type { Job } from "./listings";
import { buildSearchKey } from "./search";

function job(overrides: Partial<Job>): Job {
  return {
    company: "Xendit",
    title: "Software Engineer",
    locations: ["Manila, Philippines"],
    workSetup: "hybrid",
    level: "mid",
    function: "engineering",
    industry: "fintech",
    companyType: "direct",
    metro: ["ncr"],
    url: `https://example.com/${Math.random()}`,
    posted: "2026-09-01",
    ...overrides,
  };
}

const jobs = [
  job({ title: "Software Engineering Intern", level: "internship" }),
  job({ title: "Accountant", level: "unknown", function: "finance" }),
  job({ title: "Backend Engineer", level: "unknown" }),
  job({
    title: "Finance Intern",
    level: "internship",
    function: "finance",
    workSetup: "onsite",
  }),
];
const keys = jobs.map(buildSearchKey);
const run = (f: Partial<Filters>) => filterJobs(jobs, keys, { ...defaultFilters(), ...f });

describe("filterJobs", () => {
  it("returns everything with per-field counts in the default view", () => {
    const { filtered, fieldCounts, noLevelCount } = run({});
    expect(filtered).toHaveLength(4);
    expect(fieldCounts).toEqual({ engineering: 2, finance: 2 });
    expect(noLevelCount).toBe(0);
  });

  it("counts fields against the other filters only, so a picked field keeps its siblings", () => {
    const { filtered, fieldCounts } = run({ levels: ["internship"], fns: ["finance"] });
    expect(filtered.map((j) => j.title)).toEqual(["Finance Intern"]);
    expect(fieldCounts).toEqual({ engineering: 1, finance: 1 });
  });

  it("counts hidden no-level roles and shows them on opt-in", () => {
    expect(run({ levels: ["internship"] }).noLevelCount).toBe(2);
    expect(run({ levels: ["internship"], noLevel: true }).filtered).toHaveLength(4);
    expect(run({ levels: ["internship"], fns: ["finance"] }).noLevelCount).toBe(1);
  });

  it("applies the query and setup filters together", () => {
    const { filtered } = run({ query: "intern", setup: "onsite" });
    expect(filtered.map((j) => j.title)).toEqual(["Finance Intern"]);
  });
});
