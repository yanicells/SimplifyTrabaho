import { describe, expect, it } from "vitest";
import { buildGraph } from "./structured-data";
import { SITE_DESCRIPTION, SITE_TITLE, SITE_URL } from "./site";

const INPUT = {
  updatedAt: "2026-08-08T03:00:00.000Z",
  jobCount: 6551,
  companyCount: 126,
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
};

interface Node {
  "@type": string;
  "@id"?: string;
  [key: string]: unknown;
}

function nodes(): Node[] {
  return (buildGraph(INPUT) as { "@graph": Node[] })["@graph"];
}

function node(type: string): Node {
  const found = nodes().find((n) => n["@type"] === type);
  if (!found) throw new Error(`no ${type} node in the graph`);
  return found;
}

describe("buildGraph", () => {
  it("emits the four nodes the page claims", () => {
    expect(nodes().map((n) => n["@type"])).toEqual([
      "Organization",
      "WebSite",
      "CollectionPage",
      "Dataset",
    ]);
  });

  it("gives every node a unique, absolute @id", () => {
    const ids = nodes().map((n) => n["@id"]);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(id).toMatch(new RegExp(`^${SITE_URL}/#`));
    }
  });

  it("cross-references only @ids that exist in the graph", () => {
    // A node is *defined* wherever it carries an @id alongside real properties
    // (Organization's logo is defined nested, which is valid JSON-LD); it is
    // *referenced* by the bare `{ "@id": ... }` stub form.
    const defined = new Set<string>();
    const referenced = new Set<string>();
    JSON.stringify(buildGraph(INPUT), (_key, value) => {
      if (typeof value === "object" && value !== null && !Array.isArray(value)) {
        const id = (value as Node)["@id"];
        if (typeof id === "string") {
          const isStub = Object.keys(value).length === 1;
          (isStub ? referenced : defined).add(id);
        }
      }
      return value;
    });
    expect(referenced.size).toBeGreaterThan(0);
    for (const ref of referenced) {
      expect([...defined]).toContain(ref);
    }
  });

  it("reports the same counts the page renders", () => {
    expect(node("Dataset").description).toContain("6,551");
    expect(node("Dataset").description).toContain("126");
  });

  it("propagates the pipeline timestamp as dateModified", () => {
    expect(node("CollectionPage").dateModified).toBe(INPUT.updatedAt);
    expect(node("Dataset").dateModified).toBe(INPUT.updatedAt);
  });

  it("points the canonical page URL at the site root with a trailing slash", () => {
    expect(node("CollectionPage").url).toBe(`${SITE_URL}/`);
  });

  it("uses the raster logo, since Google's logo rich result rejects SVG", () => {
    const logo = node("Organization").logo as { url: string };
    expect(logo.url).toBe(`${SITE_URL}/icon`);
    expect(logo.url).not.toMatch(/\.svg$/);
  });

  // Guard rail, not a nicety. JobPosting requires `description` — the job
  // description text — and CLAUDE.md golden rule 3 forbids storing it. Emitting
  // JobPosting anyway would be job-posting spam under Google's policy and could
  // earn a manual action on the whole domain. See the header comment in
  // structured-data.ts before touching this.
  it("never emits JobPosting markup", () => {
    expect(JSON.stringify(buildGraph(INPUT))).not.toContain("JobPosting");
  });

  it("shares the title and description with the page metadata", () => {
    expect(node("CollectionPage").name).toBe(SITE_TITLE);
    expect(node("WebSite").description).toBe(SITE_DESCRIPTION);
  });
});
