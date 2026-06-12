import { describe, expect, it } from "vitest";
import { recategorizeDataset } from "../src/backfill.js";
import type { Listing, Registry } from "../src/types.js";

// `pnpm --filter pipeline recategorize` core (SPEC §9): full-dataset backfill,
// including inactive listings, and the designated v1→v2 migration path.

const registry: Registry = {
  version: 1,
  companies: [
    {
      name: "Xendit",
      ats: "greenhouse",
      slug: "xendit",
      industry: "fintech",
      verified: true,
      added: "2026-06-11",
    },
  ],
};

/** A schema-v1 listing as stored on disk — no industry, no metro. */
function v1Listing(overrides: Partial<Listing> = {}): Record<string, unknown> {
  const listing: Record<string, unknown> = {
    id: "abc123def456",
    company: "Xendit",
    title: "Cashier",
    locations: ["Cebu City, Philippines"],
    workSetup: "onsite",
    level: "unknown",
    function: "other",
    url: "https://example.com/jobs/1",
    source: "greenhouse",
    employmentType: "full-time",
    salary: null,
    datePosted: "2026-05-01T00:00:00.000Z",
    dateUpdated: "2026-05-20T00:00:00.000Z",
    active: true,
    ...overrides,
  };
  delete (listing as { industry?: unknown }).industry;
  delete (listing as { metro?: unknown }).metro;
  return listing;
}

function v1File(listings: Record<string, unknown>[]): unknown {
  return { version: 1, updatedAt: "2026-06-11T22:00:00.000Z", listings };
}

describe("recategorizeDataset", () => {
  it("migrates a v1 file to v2: recategorizes, derives metro, copies industry", () => {
    const { file, summary } = recategorizeDataset(v1File([v1Listing()]), registry);
    expect(file.version).toBe(2);
    const listing = file.listings[0]!;
    expect(listing.function).toBe("retail"); // v2 table catches "Cashier"
    expect(listing.metro).toEqual(["cebu"]);
    expect(listing.industry).toBe("fintech");
    expect(summary.functionChanged).toBe(1);
  });

  it("preserves datePosted and does NOT bump dateUpdated for category-only changes", () => {
    const { file } = recategorizeDataset(v1File([v1Listing()]), registry);
    const listing = file.listings[0]!;
    // re-tagging is our metadata, not a change in the listing itself (SPEC §9)
    expect(listing.datePosted).toBe("2026-05-01T00:00:00.000Z");
    expect(listing.dateUpdated).toBe("2026-05-20T00:00:00.000Z");
  });

  it("keeps the file-level updatedAt unchanged (not a pipeline run)", () => {
    const { file } = recategorizeDataset(v1File([v1Listing()]), registry);
    expect(file.updatedAt).toBe("2026-06-11T22:00:00.000Z");
  });

  it("backfills inactive listings too", () => {
    const { file } = recategorizeDataset(
      v1File([v1Listing({ active: false, title: "Company Nurse" })]),
      registry,
    );
    expect(file.listings[0]!.active).toBe(false);
    expect(file.listings[0]!.function).toBe("healthcare");
    expect(file.listings[0]!.metro).toEqual(["cebu"]);
  });

  it("leaves industry empty when the company is gone from the registry", () => {
    const { file, summary } = recategorizeDataset(
      v1File([v1Listing({ company: "Vanished Co" })]),
      registry,
    );
    expect(file.listings[0]!.industry).toBe("");
    expect(summary.unknownCompanies).toEqual(["Vanished Co"]);
  });

  it("is idempotent over a v2 file", () => {
    const first = recategorizeDataset(v1File([v1Listing()]), registry);
    const second = recategorizeDataset(
      JSON.parse(JSON.stringify(first.file)),
      registry,
    );
    expect(second.file).toEqual(first.file);
    expect(second.summary.functionChanged).toBe(0);
    expect(second.summary.levelChanged).toBe(0);
  });

  it("rejects files that are neither v1 nor v2", () => {
    expect(() =>
      recategorizeDataset({ version: 3, updatedAt: "x", listings: [] }, registry),
    ).toThrow(/version/i);
  });

  it("never touches facts: title, locations, url, salary stay verbatim", () => {
    const input = v1Listing({ title: " Padded Title ", salary: "₱30K" });
    const { file } = recategorizeDataset(v1File([input]), registry);
    const listing = file.listings[0]!;
    expect(listing.title).toBe(" Padded Title ");
    expect(listing.locations).toEqual(["Cebu City, Philippines"]);
    expect(listing.url).toBe("https://example.com/jobs/1");
    expect(listing.salary).toBe("₱30K");
  });
});
