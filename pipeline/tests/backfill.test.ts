import { describe, expect, it } from "vitest";
import { recategorizeDataset } from "../src/backfill.js";
import type { Listing, Registry } from "../src/types.js";

// `pnpm --filter pipeline recategorize` core (SPEC §9): full-dataset backfill,
// including inactive listings, and the designated v2→v3 migration path.

const registry: Registry = {
  version: 1,
  companies: [
    {
      name: "Xendit",
      ats: "greenhouse",
      slug: "xendit",
      industry: "fintech",
      type: "direct",
      verified: true,
      added: "2026-06-11",
    },
  ],
};

/** A schema-v2 listing as stored on disk — no companyType. */
function v2Listing(overrides: Partial<Listing> = {}): Record<string, unknown> {
  const listing: Record<string, unknown> = {
    id: "abc123def456",
    company: "Xendit",
    title: "Cashier",
    locations: ["Cebu City, Philippines"],
    workSetup: "onsite",
    level: "unknown",
    function: "other",
    industry: "",
    metro: [],
    url: "https://example.com/jobs/1",
    source: "greenhouse",
    employmentType: "full-time",
    salary: null,
    datePosted: "2026-05-01T00:00:00.000Z",
    dateUpdated: "2026-05-20T00:00:00.000Z",
    active: true,
    ...overrides,
  };
  delete (listing as { companyType?: unknown }).companyType;
  return listing;
}

function v2File(listings: Record<string, unknown>[]): unknown {
  return { version: 2, updatedAt: "2026-06-11T22:00:00.000Z", listings };
}

describe("recategorizeDataset", () => {
  it("migrates a v2 file to v3: recategorizes, derives metro, copies industry", () => {
    const { file, summary } = recategorizeDataset(v2File([v2Listing()]), registry);
    expect(file.version).toBe(3);
    const listing = file.listings[0]!;
    expect(listing.function).toBe("retail"); // v2 table catches "Cashier"
    expect(listing.metro).toEqual(["cebu"]);
    expect(listing.industry).toBe("fintech");
    expect(summary.functionChanged).toBe(1);
  });

  it("preserves datePosted and does NOT bump dateUpdated for category-only changes", () => {
    const { file } = recategorizeDataset(v2File([v2Listing()]), registry);
    const listing = file.listings[0]!;
    // re-tagging is our metadata, not a change in the listing itself (SPEC §9)
    expect(listing.datePosted).toBe("2026-05-01T00:00:00.000Z");
    expect(listing.dateUpdated).toBe("2026-05-20T00:00:00.000Z");
  });

  it("keeps the file-level updatedAt unchanged (not a pipeline run)", () => {
    const { file } = recategorizeDataset(v2File([v2Listing()]), registry);
    expect(file.updatedAt).toBe("2026-06-11T22:00:00.000Z");
  });

  it("backfills inactive listings too", () => {
    const { file } = recategorizeDataset(
      v2File([v2Listing({ active: false, title: "Company Nurse" })]),
      registry,
    );
    expect(file.listings[0]!.active).toBe(false);
    expect(file.listings[0]!.function).toBe("healthcare");
    expect(file.listings[0]!.metro).toEqual(["cebu"]);
  });

  it("leaves industry empty when the company is gone from the registry", () => {
    const { file, summary } = recategorizeDataset(
      v2File([v2Listing({ company: "Vanished Co" })]),
      registry,
    );
    expect(file.listings[0]!.industry).toBe("");
    expect(summary.unknownCompanies).toEqual(["Vanished Co"]);
  });

  it("is idempotent over a v3 file", () => {
    const first = recategorizeDataset(v2File([v2Listing()]), registry);
    const second = recategorizeDataset(
      JSON.parse(JSON.stringify(first.file)),
      registry,
    );
    expect(second.file).toEqual(first.file);
    expect(second.summary.functionChanged).toBe(0);
    expect(second.summary.levelChanged).toBe(0);
  });

  it("migrates v2 → v3 and stamps companyType from the registry", () => {
    const registry = { version: 1 as const, companies: [
      { name: "Kumu", ats: "bamboohr" as const, slug: "kumu", industry: "consumer", type: "direct" as const, verified: true, added: "2026-06-13" },
      { name: "Emapta", ats: "workable" as const, slug: "emapta", industry: "outsourcing", type: "agency" as const, verified: true, added: "2026-06-11" },
    ] };
    const v2 = { version: 2, updatedAt: "2026-06-12T00:00:00.000Z", listings: [
      { id: "a", company: "Kumu", title: "Intern", locations: ["Makati, Philippines"], workSetup: "onsite", level: "internship", function: "other", industry: "consumer", metro: ["ncr"], url: "u1", source: "bamboohr", employmentType: "internship", salary: null, datePosted: "2026-06-01T00:00:00.000Z", dateUpdated: "2026-06-01T00:00:00.000Z", active: true },
      { id: "b", company: "Emapta", title: "Agent", locations: ["Manila, Philippines"], workSetup: "onsite", level: "entry", function: "customer-support", industry: "outsourcing", metro: ["ncr"], url: "u2", source: "workable", employmentType: "full-time", salary: null, datePosted: "2026-06-01T00:00:00.000Z", dateUpdated: "2026-06-01T00:00:00.000Z", active: true },
    ] };
    const { file } = recategorizeDataset(v2, registry as any);
    expect(file.version).toBe(3);
    expect(file.listings.find((l) => l.company === "Kumu")!.companyType).toBe("direct");
    expect(file.listings.find((l) => l.company === "Emapta")!.companyType).toBe("agency");
  });

  it("leaves companyType direct when the company is missing from the registry", () => {
    const v2 = { version: 2, updatedAt: "t", listings: [
      { id: "a", company: "Gone", title: "X", locations: [], workSetup: "unknown", level: "unknown", function: "other", industry: "", metro: [], url: "u", source: "lever", employmentType: "unknown", salary: null, datePosted: "2026-06-01T00:00:00.000Z", dateUpdated: "2026-06-01T00:00:00.000Z", active: false },
    ] };
    const { file } = recategorizeDataset(v2, { version: 1, companies: [] } as any);
    expect(file.listings[0]!.companyType).toBe("direct"); // safe default; inactive history
  });

  it("rejects files that are neither v2 nor v3", () => {
    expect(() =>
      recategorizeDataset({ version: 1, updatedAt: "x", listings: [] }, registry),
    ).toThrow(/version/i);
  });

  it("never touches facts: title, locations, url, salary stay verbatim", () => {
    const input = v2Listing({ title: " Padded Title ", salary: "₱30K" });
    const { file } = recategorizeDataset(v2File([input]), registry);
    const listing = file.listings[0]!;
    expect(listing.title).toBe(" Padded Title ");
    expect(listing.locations).toEqual(["Cebu City, Philippines"]);
    expect(listing.url).toBe("https://example.com/jobs/1");
    expect(listing.salary).toBe("₱30K");
  });
});
