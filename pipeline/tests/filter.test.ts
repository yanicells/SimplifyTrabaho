import { describe, expect, it } from "vitest";
import { isPhilippineLocation, filterPhilippines, PH_LOCATION_KEYWORDS } from "../src/filter.js";
import type { FetchedPosting } from "../src/types.js";

describe("isPhilippineLocation", () => {
  it("accepts country names", () => {
    expect(isPhilippineLocation("Manila, Philippines")).toBe(true);
    expect(isPhilippineLocation("Pilipinas")).toBe(true);
  });

  it("accepts metro/city names", () => {
    expect(isPhilippineLocation("Makati")).toBe(true);
    expect(isPhilippineLocation("Taguig City")).toBe(true);
    expect(isPhilippineLocation("BGC")).toBe(true);
    expect(isPhilippineLocation("Quezon City")).toBe(true);
    expect(isPhilippineLocation("Cebu")).toBe(true);
    expect(isPhilippineLocation("Cagayan de Oro")).toBe(true);
  });

  it("accepts Parañaque with and without the eñe", () => {
    expect(isPhilippineLocation("Parañaque")).toBe(true);
    expect(isPhilippineLocation("Paranaque City")).toBe(true);
  });

  it("accepts PH-tied remote markers", () => {
    expect(isPhilippineLocation("Remote - Philippines")).toBe(true);
    expect(isPhilippineLocation("Remote (Philippines)")).toBe(true);
    expect(isPhilippineLocation("Philippines - Remote")).toBe(true);
  });

  it("accepts bare PH only as a word-boundary token", () => {
    expect(isPhilippineLocation("Manila, PH")).toBe(true);
    expect(isPhilippineLocation("(PH)")).toBe(true);
    expect(isPhilippineLocation("Memphis, TN")).toBe(false);
    expect(isPhilippineLocation("Phoenix, AZ")).toBe(false);
  });

  it("rejects broad remote regions (cannot confirm PH eligibility)", () => {
    expect(isPhilippineLocation("Remote")).toBe(false);
    expect(isPhilippineLocation("Remote - APAC")).toBe(false);
    expect(isPhilippineLocation("Remote - Asia")).toBe(false);
    expect(isPhilippineLocation("Remote - Southeast Asia")).toBe(false);
  });

  it("rejects non-PH locations", () => {
    expect(isPhilippineLocation("Singapore, Singapore")).toBe(false);
    expect(isPhilippineLocation("Jakarta, Indonesia")).toBe(false);
    expect(isPhilippineLocation("Kuala Lumpur, Malaysia")).toBe(false);
  });

  it("matches city keywords on word boundaries only", () => {
    // "Clark" is a PH keyword but must not match inside other words
    expect(isPhilippineLocation("Clark, Pampanga")).toBe(true);
    expect(isPhilippineLocation("Clarksville, TN")).toBe(false);
  });
});

describe("PH_LOCATION_KEYWORDS", () => {
  it("is a single exported, extendable list", () => {
    expect(PH_LOCATION_KEYWORDS).toContain("philippines");
    expect(PH_LOCATION_KEYWORDS).toContain("cebu");
  });
});

function posting(locations: string[]): FetchedPosting {
  return {
    company: "Test Co",
    source: "greenhouse",
    title: "Engineer",
    locations,
    url: "https://example.com/jobs/1",
    workSetup: "unknown",
    employmentType: "unknown",
    salary: null,
    publishedAt: null,
  };
}

describe("filterPhilippines", () => {
  it("keeps a posting when at least one location matches", () => {
    const { kept } = filterPhilippines([
      posting(["Jakarta, Indonesia; Manila, Philippines".split("; ")[0]!, "Manila, Philippines"]),
      posting(["Bangkok, Thailand"]),
    ]);
    expect(kept).toHaveLength(1);
    expect(kept[0]!.locations).toContain("Manila, Philippines");
  });

  it("collects a unique sample of rejected location strings", () => {
    const { rejectedLocations } = filterPhilippines([
      posting(["Bangkok, Thailand"]),
      posting(["Bangkok, Thailand"]),
      posting(["Singapore, Singapore"]),
    ]);
    expect(rejectedLocations).toEqual(["Bangkok, Thailand", "Singapore, Singapore"]);
  });

  it("keeps everything PH and rejects everything else", () => {
    const { kept, rejectedLocations } = filterPhilippines([
      posting(["Taguig, Philippines"]),
      posting(["Remote - APAC"]),
      posting(["Cebu City"]),
    ]);
    expect(kept).toHaveLength(2);
    expect(rejectedLocations).toEqual(["Remote - APAC"]);
  });
});
