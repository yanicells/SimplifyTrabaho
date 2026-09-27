import { describe, expect, it } from "vitest";
import { filtersFromSearch, filtersToSearch } from "./filter-params";
import { fillTemplate, LANDINGS, landingFilters } from "./landings";

describe("LANDINGS", () => {
  it("uses unique, URL-safe slugs", () => {
    const slugs = LANDINGS.map((l) => l.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  // A preset the URL codec would drop means the page shows one view but a
  // shared link or Reset lands somewhere else.
  it("only presets filters the URL codec accepts", () => {
    for (const landing of LANDINGS) {
      const search = filtersToSearch(landingFilters(landing));
      expect(search, landing.slug).not.toBe("");
      expect(filtersToSearch(filtersFromSearch(search)), landing.slug).toBe(search);
    }
  });

  it("leaves no unfilled placeholders", () => {
    const stats = { count: 1234, companies: 56 };
    for (const l of LANDINGS) {
      const texts = [l.title, l.description, l.intro, ...l.faq.flatMap((f) => [f.q, f.a])];
      for (const text of texts) {
        expect(fillTemplate(text, stats, "2026-09-27T00:00:00Z")).not.toMatch(/[{}]/);
      }
    }
  });
});

describe("fillTemplate", () => {
  it("formats counts and takes the year from the refresh date", () => {
    expect(
      fillTemplate("{count} at {companies} ({year})", { count: 1234, companies: 5 }, "2027-01-02T00:00:00Z"),
    ).toBe("1,234 at 5 (2027)");
  });
});
