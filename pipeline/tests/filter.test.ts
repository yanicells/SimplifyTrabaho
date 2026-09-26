import { describe, expect, it } from "vitest";
import {
  isPhilippineLocation,
  filterPhilippines,
  PH_LOCATION_KEYWORDS,
} from "../src/filter.js";
import type { FetchedPosting } from "../src/types.js";

describe("isPhilippineLocation", () => {
  it("rejects US cities that share a PH name, unless the country is named", () => {
    expect(isPhilippineLocation("Santa Rosa, CA")).toBe(false);
    expect(isPhilippineLocation("Laguna Hills, California, United States")).toBe(false);
    expect(isPhilippineLocation("Santa Rosa, Laguna")).toBe(true);
    expect(isPhilippineLocation("Makati, PH")).toBe(true);
    expect(isPhilippineLocation("Santa Rosa, Laguna, Philippines")).toBe(true);
  });

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

  it("accepts NCR codes as published by Workday tenants (GCash 'NCR - WGC')", () => {
    expect(isPhilippineLocation("NCR - WGC")).toBe(true);
    expect(isPhilippineLocation("NCR - WCC")).toBe(true);
    expect(isPhilippineLocation("National Capital Region")).toBe(true);
    // Word boundaries: "ncr" inside another word never matches.
    expect(isPhilippineLocation("Suncrest, CA")).toBe(false);
  });

  it("rejects other countries' namesakes of PH keywords unless PH is named", () => {
    expect(isPhilippineLocation("Gurugram, Delhi NCR, India")).toBe(false);
    expect(isPhilippineLocation("Noida, NCR")).toBe(false);
    expect(isPhilippineLocation("Ottawa, National Capital Region, Canada")).toBe(false);
    expect(isPhilippineLocation("Manila, Arkansas")).toBe(false);
    expect(isPhilippineLocation("Laguna Hills, California")).toBe(false);
    expect(isPhilippineLocation("Santa Rosa, La Pampa, Argentina")).toBe(false);
    // Naming the country (or its PH code) still wins over a foreign marker.
    expect(isPhilippineLocation("India & PH (Remote)")).toBe(true);
    expect(isPhilippineLocation("Makati, Philippines (reports to Delhi NCR)")).toBe(true);
    // A state name inside a PH place, not as its own part, is not a US state.
    expect(isPhilippineLocation("California Garden Square, Mandaluyong")).toBe(true);
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

  it("does not treat 'ph' inside accented words as a PH token (Vietnamese cities)", () => {
    // "phố" tricked ASCII \b: ố is a non-word char to JS regex, giving "ph" a boundary
    expect(isPhilippineLocation("Thành phố Hồ Chí Minh, Hồ Chí Minh, Vietnam")).toBe(false);
    expect(isPhilippineLocation("Tân Bình, Thành phố Hồ Chí Minh, Vietnam")).toBe(false);
    expect(isPhilippineLocation("Hải Phòng, Vietnam")).toBe(false);
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

  it("keeps Fast Retailing PH stores and named Philippine regions", () => {
    expect(isPhilippineLocation("UNIQLO SM Makati (FRPH)")).toBe(true);
    expect(isPhilippineLocation("UNIQLO SM City Bacolod(FRPH)")).toBe(true);
    expect(isPhilippineLocation("Visayas")).toBe(true);
    expect(isPhilippineLocation("Eastern Visayas")).toBe(true);
    expect(isPhilippineLocation("Mindanao")).toBe(true);
    expect(isPhilippineLocation("Bohol, Central Visayas")).toBe(true);
  });

  it("does not accept ambiguous mall or place names", () => {
    expect(isPhilippineLocation("SM City Xiamen, China")).toBe(false);
    expect(isPhilippineLocation("Santa Rosa, CA")).toBe(false);
    expect(isPhilippineLocation("San Pablo, CA")).toBe(false);
    expect(isPhilippineLocation("Victoria, Australia")).toBe(false);
    expect(isPhilippineLocation("Cordova, Spain")).toBe(false);
    expect(isPhilippineLocation("La Union, New Mexico")).toBe(false);
    expect(isPhilippineLocation("Alabama, USA")).toBe(false);
    expect(isPhilippineLocation("Visayasian, USA")).toBe(false);
    expect(isPhilippineLocation("FRPHX, USA")).toBe(false);
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
    industry: "",
    companyType: "direct",
  };
}

describe("filterPhilippines", () => {
  it("keeps a posting when at least one location matches", () => {
    const { kept } = filterPhilippines([
      posting([
        "Jakarta, Indonesia; Manila, Philippines".split("; ")[0]!,
        "Manila, Philippines",
      ]),
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
