import { describe, expect, it } from "vitest";
import type { Job } from "./listings";
import { buildSearchKey, matchesQuery, parseQuery } from "./search";

const job = (overrides: Partial<Job>): Job => ({
  company: "Acme",
  title: "Analyst",
  locations: [],
  workSetup: "unknown",
  level: "unknown",
  function: "other",
  industry: "",
  companyType: "direct",
  metro: [],
  url: "https://example.com",
  posted: "2026-09-01",
  ...overrides,
});

const matches = (j: Job, query: string) => matchesQuery(buildSearchKey(j), parseQuery(query));

describe("smart search", () => {
  it("matches every term at word start, across title, labels and places", () => {
    const engineer = job({
      title: "Machine Learning Engineer",
      function: "data",
      workSetup: "remote",
      metro: ["cebu"],
    });
    expect(matches(engineer, "data ai remote")).toBe(true);
    expect(matches(engineer, "eng cebu")).toBe(true);
    expect(matches(engineer, "gineer")).toBe(false); // mid-word
    expect(matches(engineer, "data hybrid")).toBe(false); // every term must match
  });

  it("finds 'it' as a word, not inside 'security'", () => {
    expect(matches(job({ title: "IT Intern", level: "internship" }), "it intern")).toBe(true);
    expect(matches(job({ industry: "it-services" }), "it")).toBe(true);
    expect(matches(job({ title: "Security Analyst" }), "it")).toBe(false);
  });

  it("matches industry tags and their labels", () => {
    expect(matches(job({ industry: "fintech" }), "fintech")).toBe(true);
    expect(matches(job({ industry: "ai-data" }), "ai data")).toBe(true);
  });

  it("ignores filler words and expands aliases", () => {
    expect(matches(job({ title: "Head of Sales" }), "head of the sales")).toBe(true);
    expect(matches(job({ level: "internship" }), "ojt")).toBe(true);
    expect(matches(job({ level: "entry" }), "fresh grad")).toBe(true);
    expect(matches(job({ workSetup: "remote" }), "wfh")).toBe(true);
    expect(matches(job({ locations: ["Taguig City"] }), "bgc")).toBe(true);
  });

  it("matches everything for an empty or filler-only query", () => {
    expect(parseQuery("  ")).toEqual([]);
    expect(matches(job({}), "and &")).toBe(true);
  });
});
