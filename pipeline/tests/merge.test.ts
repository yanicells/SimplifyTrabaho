import { describe, expect, it } from "vitest";
import { buildListing, listingId, mergeListings } from "../src/merge.js";
import type { FetchedPosting, Listing } from "../src/types.js";

const NOW = "2026-06-11T22:00:00.000Z";
const EARLIER = "2026-06-01T22:00:00.000Z";

function posting(overrides: Partial<FetchedPosting> = {}): FetchedPosting {
  return {
    company: "Xendit",
    source: "greenhouse",
    title: "Risk Operations Analyst",
    locations: ["Manila, Philippines"],
    url: "https://example.com/jobs/1",
    workSetup: "unknown",
    employmentType: "unknown",
    salary: null,
    publishedAt: "2026-05-01T00:00:00.000Z",
    industry: "fintech",
    companyType: "direct",
    ...overrides,
  };
}

describe("listingId", () => {
  it("is the first 12 hex chars of the SHA-256 of the URL", () => {
    expect(listingId("https://example.com/jobs/1")).toBe("3fbd7ba75984");
  });
});

describe("buildListing", () => {
  it("assembles a categorized, active listing", () => {
    const listing = buildListing(posting({ title: "Software Engineering Intern" }), NOW);
    expect(listing).toMatchObject({
      id: "3fbd7ba75984",
      company: "Xendit",
      title: "Software Engineering Intern",
      level: "internship",
      function: "engineering",
      datePosted: "2026-05-01T00:00:00.000Z",
      dateUpdated: NOW,
      active: true,
    });
  });

  it("carries the registry industry and derives metro tags (schema v2)", () => {
    const listing = buildListing(
      posting({ locations: ["Cebu City, Philippines", "Manila, Philippines"] }),
      NOW,
    );
    expect(listing.industry).toBe("fintech");
    expect(listing.metro).toEqual(["ncr", "cebu"]);
  });

  it("carries companyType from posting onto the listing", () => {
    const fetched = posting({ companyType: "agency" });
    expect(buildListing(fetched, NOW).companyType).toBe("agency");
  });

  it("falls back to first-seen time when the ATS gives no published date", () => {
    const listing = buildListing(posting({ publishedAt: null }), NOW);
    expect(listing.datePosted).toBe(NOW);
  });
});

function existingListing(overrides: Partial<Listing> = {}): Listing {
  return {
    ...buildListing(posting(), EARLIER),
    dateUpdated: EARLIER,
    ...overrides,
  };
}

describe("mergeListings", () => {
  it("adds new listings", () => {
    const { listings, summary } = mergeListings({
      existing: [],
      current: [buildListing(posting(), NOW)],
      fetchedCompanies: new Set(["Xendit"]),
      now: NOW,
    });
    expect(listings).toHaveLength(1);
    expect(summary).toMatchObject({ added: 1, updated: 0, deactivated: 0 });
  });

  it("leaves unchanged listings untouched (dateUpdated preserved)", () => {
    const existing = existingListing();
    const { listings, summary } = mergeListings({
      existing: [existing],
      current: [buildListing(posting(), NOW)],
      fetchedCompanies: new Set(["Xendit"]),
      now: NOW,
    });
    expect(listings[0]!.dateUpdated).toBe(EARLIER);
    expect(summary).toMatchObject({ added: 0, updated: 0, unchanged: 1 });
  });

  it("bumps dateUpdated when a field changes, but never datePosted", () => {
    const existing = existingListing();
    const changed = buildListing(
      posting({ locations: ["Taguig, Philippines"], publishedAt: "2026-06-09T00:00:00.000Z" }),
      NOW,
    );
    const { listings, summary } = mergeListings({
      existing: [existing],
      current: [changed],
      fetchedCompanies: new Set(["Xendit"]),
      now: NOW,
    });
    expect(listings[0]!.locations).toEqual(["Taguig, Philippines"]);
    expect(listings[0]!.dateUpdated).toBe(NOW);
    expect(listings[0]!.datePosted).toBe(existing.datePosted);
    expect(summary.updated).toBe(1);
  });

  it("bumps dateUpdated when the registry industry changes (schema v2 field)", () => {
    const existing = existingListing();
    const { listings, summary } = mergeListings({
      existing: [existing],
      current: [buildListing(posting({ industry: "payments" }), NOW)],
      fetchedCompanies: new Set(["Xendit"]),
      now: NOW,
    });
    expect(listings[0]!.industry).toBe("payments");
    expect(listings[0]!.dateUpdated).toBe(NOW);
    expect(summary.updated).toBe(1);
  });

  it("bumps dateUpdated when companyType changes", () => {
    const old = buildListing(posting({ companyType: "agency" }), EARLIER);
    const current = buildListing(posting({ companyType: "direct" }), NOW);
    const { listings } = mergeListings({
      existing: [old],
      current: [current],
      fetchedCompanies: new Set([old.company]),
      now: NOW,
    });
    expect(listings[0]!.companyType).toBe("direct");
    expect(listings[0]!.dateUpdated).toBe(NOW);
  });

  it("deactivates listings absent from a successfully fetched company", () => {
    const existing = existingListing();
    const { listings, summary } = mergeListings({
      existing: [existing],
      current: [],
      fetchedCompanies: new Set(["Xendit"]),
      now: NOW,
    });
    expect(listings[0]!.active).toBe(false);
    expect(listings[0]!.dateUpdated).toBe(NOW);
    expect(summary.deactivated).toBe(1);
  });

  it("NEVER deactivates listings when the company fetch failed this run", () => {
    const existing = existingListing();
    const { listings, summary } = mergeListings({
      existing: [existing],
      current: [],
      fetchedCompanies: new Set(),
      now: NOW,
    });
    expect(listings[0]!.active).toBe(true);
    expect(listings[0]!.dateUpdated).toBe(EARLIER);
    expect(summary.deactivated).toBe(0);
  });

  it("reactivates a listing that reappears in the feed", () => {
    const existing = existingListing({ active: false });
    const { listings, summary } = mergeListings({
      existing: [existing],
      current: [buildListing(posting(), NOW)],
      fetchedCompanies: new Set(["Xendit"]),
      now: NOW,
    });
    expect(listings[0]!.active).toBe(true);
    expect(listings[0]!.dateUpdated).toBe(NOW);
    expect(summary.updated).toBe(1);
  });

  it("keeps inactive listings forever", () => {
    const inactive = existingListing({ active: false });
    const { listings } = mergeListings({
      existing: [inactive],
      current: [],
      fetchedCompanies: new Set(["Xendit"]),
      now: NOW,
    });
    expect(listings).toHaveLength(1);
    expect(listings[0]!.active).toBe(false);
    // already inactive — not a new deactivation, date untouched
    expect(listings[0]!.dateUpdated).toBe(EARLIER);
  });

  it("stable-sorts by company asc then datePosted desc", () => {
    const a = buildListing(
      posting({ company: "Ayala", url: "https://example.com/a", publishedAt: EARLIER }),
      NOW,
    );
    const b = buildListing(
      posting({ company: "Ayala", url: "https://example.com/b", publishedAt: NOW }),
      NOW,
    );
    const c = buildListing(
      posting({ company: "Xendit", url: "https://example.com/c", publishedAt: NOW }),
      NOW,
    );
    const { listings } = mergeListings({
      existing: [],
      current: [c, a, b],
      fetchedCompanies: new Set(["Ayala", "Xendit"]),
      now: NOW,
    });
    expect(listings.map((l) => l.url)).toEqual([
      "https://example.com/b",
      "https://example.com/a",
      "https://example.com/c",
    ]);
  });
});
