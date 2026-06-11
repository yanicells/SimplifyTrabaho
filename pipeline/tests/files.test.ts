import { describe, expect, it } from "vitest";
import {
  parseRegistry,
  parseListingsFile,
  emptyListingsFile,
  mergeRegistryCompanies,
} from "../src/files.js";
import type { RegistryCompany } from "../src/types.js";

const validCompany = {
  name: "Xendit",
  ats: "greenhouse",
  slug: "xendit",
  industry: "fintech",
  verified: true,
  added: "2026-06-11",
};

describe("parseRegistry", () => {
  it("accepts a valid registry", () => {
    const registry = parseRegistry({ version: 1, companies: [validCompany] });
    expect(registry.companies).toHaveLength(1);
  });

  it("rejects unknown ATS ids", () => {
    expect(() =>
      parseRegistry({ version: 1, companies: [{ ...validCompany, ats: "workday" }] }),
    ).toThrow(/ats/i);
  });

  it("rejects duplicate ats+slug pairs", () => {
    expect(() =>
      parseRegistry({
        version: 1,
        companies: [validCompany, { ...validCompany, name: "Dupe" }],
      }),
    ).toThrow(/duplicate/i);
  });

  it("rejects missing required fields", () => {
    expect(() =>
      parseRegistry({ version: 1, companies: [{ name: "NoSlug", ats: "lever" }] }),
    ).toThrow(/slug/i);
  });
});

describe("parseListingsFile", () => {
  it("accepts a valid file and the empty default", () => {
    const file = parseListingsFile(emptyListingsFile("2026-06-11T22:00:00.000Z"));
    expect(file.version).toBe(1);
    expect(file.listings).toEqual([]);
  });

  it("rejects files without a listings array", () => {
    expect(() => parseListingsFile({ version: 1, updatedAt: "x" })).toThrow(/listings/i);
  });

  it("rejects unsupported versions", () => {
    expect(() => parseListingsFile({ version: 2, updatedAt: "x", listings: [] })).toThrow(
      /version/i,
    );
  });
});

describe("mergeRegistryCompanies", () => {
  const entry = (
    name: string,
    ats: RegistryCompany["ats"],
    slug: string,
  ): RegistryCompany => ({
    name,
    ats,
    slug,
    industry: "",
    verified: true,
    added: "2026-06-11",
  });

  it("keeps existing entries when the same ats+slug is re-added", () => {
    const existing = { ...entry("Xendit", "greenhouse", "xendit"), notes: "hand-tuned" };
    const merged = mergeRegistryCompanies(
      [existing],
      [entry("Xendit2", "greenhouse", "xendit")],
    );
    expect(merged).toHaveLength(1);
    expect(merged[0]!.name).toBe("Xendit");
    expect(merged[0]!.notes).toBe("hand-tuned");
  });

  it("adds new entries and keeps the list alphabetized by name", () => {
    const merged = mergeRegistryCompanies(
      [entry("Xendit", "greenhouse", "xendit")],
      [entry("Canva", "smartrecruiters", "Canva"), entry("Hostaway", "recruitee", "hostaway")],
    );
    expect(merged.map((c) => c.name)).toEqual(["Canva", "Hostaway", "Xendit"]);
  });
});
