import { describe, expect, it } from "vitest";
import { generateReadme } from "../src/readme.js";
import type { Listing } from "../src/types.js";

const NOW = "2026-06-11T22:00:00.000Z";

function listing(overrides: Partial<Listing> = {}): Listing {
  return {
    id: "abc123def456",
    company: "Xendit",
    title: "Software Engineering Intern",
    locations: ["Manila, Philippines"],
    workSetup: "hybrid",
    level: "internship",
    function: "engineering",
    url: "https://example.com/jobs/1",
    source: "greenhouse",
    employmentType: "internship",
    salary: null,
    datePosted: "2026-06-08T22:00:00.000Z", // 3 days before NOW
    dateUpdated: NOW,
    active: true,
    ...overrides,
  };
}

describe("generateReadme", () => {
  const base = {
    companiesTracked: 2,
    updatedAt: NOW,
    now: NOW,
  };

  it("carries a do-not-edit header comment", () => {
    const md = generateReadme({ ...base, listings: [listing()] });
    expect(md).toMatch(/<!--[\s\S]*generated[\s\S]*do not edit[\s\S]*-->/i);
  });

  it("shows daily-refresh and CI status badges linking to the workflow runs", () => {
    const md = generateReadme({ ...base, listings: [listing()] });
    expect(md).toContain(
      "[![Daily refresh](https://github.com/yanicells/SimplifyTrabaho/actions/workflows/refresh.yml/badge.svg)](https://github.com/yanicells/SimplifyTrabaho/actions/workflows/refresh.yml)",
    );
    expect(md).toContain(
      "[![CI](https://github.com/yanicells/SimplifyTrabaho/actions/workflows/ci.yml/badge.svg)](https://github.com/yanicells/SimplifyTrabaho/actions/workflows/ci.yml)",
    );
  });

  it("uses the product display name in generated copy", () => {
    const md = generateReadme({ ...base, listings: [listing()] });
    expect(md).toContain("# SimplifyTrabaho 🇵🇭");
    expect(md).not.toContain("# simplifytrabaho 🇵🇭");
  });

  it("carries a License section: MIT code, CC0 data, attribution optional", () => {
    const md = generateReadme({ ...base, listings: [listing()] });
    expect(md).toContain("## License");
    expect(md).toContain("[MIT](LICENSE)");
    expect(md).toContain("[CC0 1.0](data/LICENSE)");
    expect(md).toMatch(/appreciated but not required/);
  });

  it("renders featured internships and entry-level rows with relative dates", () => {
    const md = generateReadme({
      ...base,
      listings: [
        listing(),
        listing({
          id: "x2",
          title: "Junior Accountant",
          level: "entry",
          url: "https://example.com/jobs/2",
          datePosted: "2026-06-10T22:00:00.000Z",
        }),
      ],
    });
    expect(md).toContain("Software Engineering Intern");
    expect(md).toContain("[Apply](https://example.com/jobs/1)");
    expect(md).toContain("3d ago");
    expect(md).toContain("Junior Accountant");
    expect(md).toContain("1d ago");
  });

  it("features only active internship/entry roles from the last 30 days", () => {
    const md = generateReadme({
      ...base,
      listings: [
        listing({ id: "s1", title: "Senior Engineer", level: "senior" }),
        listing({ id: "i1", title: "Inactive Intern", active: false }),
        listing({
          id: "o1",
          title: "Old Intern Posting",
          datePosted: "2026-04-01T00:00:00.000Z",
        }),
        listing({ id: "k1", title: "Marketing Intern" }),
      ],
    });
    expect(md).not.toContain("Senior Engineer");
    expect(md).not.toContain("Inactive Intern");
    expect(md).not.toContain("Old Intern Posting");
    expect(md).toContain("Marketing Intern");
  });

  it("sorts featured rows newest first and caps at 200", () => {
    const many = Array.from({ length: 250 }, (_, i) =>
      listing({
        id: `id${i}`,
        title: `Intern Role ${i}`,
        url: `https://example.com/jobs/${i}`,
        datePosted: new Date(Date.parse(NOW) - i * 60_000).toISOString(),
      }),
    );
    const md = generateReadme({ ...base, listings: many });
    const rows = md.split("\n").filter((line) => line.includes("[Apply]("));
    expect(rows).toHaveLength(200);
    expect(rows[0]).toContain("Intern Role 0");
  });

  it("reports counts and the last-updated stamp", () => {
    const md = generateReadme({
      ...base,
      listings: [listing(), listing({ id: "z9", active: false })],
    });
    expect(md).toMatch(/1 active listing/);
    expect(md).toMatch(/2 companies tracked/);
    expect(md).toContain("2026-06-11");
  });
});
