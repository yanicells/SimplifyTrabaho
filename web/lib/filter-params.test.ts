import { describe, expect, it } from "vitest";
import {
  defaultFilters,
  filtersFromSearch,
  filtersToSearch,
} from "./filter-params";

// Full filter state ⇆ URL query params (SPEC §12 v2): pasting a URL must
// reproduce the view, and the default (featured) view must keep a clean URL.

describe("filtersToSearch", () => {
  it("serializes the default view (all roles, no filters) as an empty string", () => {
    expect(filtersToSearch(defaultFilters())).toBe("");
  });

  it("serializes the featured level preset explicitly", () => {
    expect(
      filtersToSearch({ ...defaultFilters(), levels: ["entry", "internship"] }),
    ).toBe("level=internship%2Centry");
  });

  it("serializes custom level sets in canonical order", () => {
    expect(
      filtersToSearch({ ...defaultFilters(), levels: ["senior", "mid"] }),
    ).toBe("level=mid%2Csenior");
  });

  it("serializes multi-select functions in canonical order", () => {
    expect(
      filtersToSearch({ ...defaultFilters(), fns: ["data", "engineering"] }),
    ).toBe("fn=engineering%2Cdata");
  });

  it("serializes every non-default field", () => {
    const search = filtersToSearch({
      levels: [],
      fns: ["healthcare"],
      setup: "remote",
      metro: "cebu",
      industry: "fintech",
      type: "direct",
      location: "cebu city",
      query: "software intern",
      company: "Sun Life",
    });
    const params = new URLSearchParams(search);
    expect(params.get("level")).toBe(null);
    expect(params.get("fn")).toBe("healthcare");
    expect(params.get("setup")).toBe("remote");
    expect(params.get("metro")).toBe("cebu");
    expect(params.get("industry")).toBe("fintech");
    expect(params.get("type")).toBe("direct");
    expect(params.get("loc")).toBe("cebu city");
    expect(params.get("q")).toBe("software intern");
    expect(params.get("company")).toBe("Sun Life");
  });
});

describe("filtersFromSearch", () => {
  it("returns the default (all roles) for an empty search", () => {
    expect(filtersFromSearch("")).toEqual(defaultFilters());
    expect(filtersFromSearch("")).not.toBe(defaultFilters()); // fresh object
    expect(defaultFilters().levels).toEqual([]);
  });

  it("round-trips every field", () => {
    const filters = {
      levels: ["mid", "senior"] as const,
      fns: ["engineering", "construction"] as const,
      setup: "hybrid" as const,
      metro: "ncr" as const,
      industry: "outsourcing",
      type: "agency" as const,
      location: "makati",
      query: "civil engineer",
      company: "Accenture",
    };
    const roundTripped = filtersFromSearch(
      filtersToSearch({ ...filters, levels: [...filters.levels], fns: [...filters.fns] }),
    );
    expect(roundTripped).toEqual(filters);
  });

  it("accepts a leading question mark (location.search form)", () => {
    expect(filtersFromSearch("?level=senior").levels).toEqual(["senior"]);
  });

  it("reads a legacy level=all link as the plain default", () => {
    expect(filtersFromSearch("level=all")).toEqual(defaultFilters());
  });

  it("ignores unknown enum values instead of breaking the view", () => {
    const filters = filtersFromSearch(
      "level=boss&fn=astronaut,sales&setup=moon&metro=atlantis&type=franchise",
    );
    expect(filters.levels).toEqual([]); // junk-only level falls back to all roles
    expect(filters.fns).toEqual(["sales"]);
    expect(filters.setup).toBe("all");
    expect(filters.metro).toBe("all");
    expect(filters.type).toBe("all");
  });

  it("round-trips the employer-type filter and omits it by default", () => {
    expect(filtersFromSearch("type=direct").type).toBe("direct");
    expect(filtersToSearch(defaultFilters())).toBe("");
    expect(filtersToSearch({ ...defaultFilters(), type: "direct" })).toBe("type=direct");
  });

  it("ignores unknown params entirely", () => {
    expect(filtersFromSearch("utm_source=fb&ref=x")).toEqual(defaultFilters());
  });

  it("round-trips the featured level preset", () => {
    const filters = filtersFromSearch("level=entry,internship");
    expect(filters.levels).toEqual(["internship", "entry"]);
    expect(filtersToSearch(filters)).toBe("level=internship%2Centry");
  });

  it("round-trips the company filter and omits it by default", () => {
    expect(filtersFromSearch("company=Sun%20Life").company).toBe("Sun Life");
    expect(filtersToSearch({ ...defaultFilters(), company: "Sun Life" })).toBe(
      "company=Sun+Life",
    );
    expect(filtersFromSearch("").company).toBe("");
    // Round-trip through the codec preserves the exact name.
    const search = filtersToSearch({ ...defaultFilters(), company: "P&G" });
    expect(filtersFromSearch(search).company).toBe("P&G");
  });
});
