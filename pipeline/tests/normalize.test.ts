import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { normalizeGreenhouse, normalizeLever } from "../src/normalize.js";
import type { RegistryCompany } from "../src/types.js";

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), "fixtures");
const greenhouseRaw = JSON.parse(
  readFileSync(join(fixturesDir, "greenhouse-xendit.json"), "utf8"),
) as unknown;
const leverRaw = JSON.parse(
  readFileSync(join(fixturesDir, "lever-ninjavan.json"), "utf8"),
) as unknown;

const xendit: RegistryCompany = {
  name: "Xendit",
  ats: "greenhouse",
  slug: "xendit",
  industry: "fintech",
  verified: true,
  added: "2026-06-11",
};

const ninjaVan: RegistryCompany = {
  name: "Ninja Van",
  ats: "lever",
  slug: "ninjavan",
  industry: "logistics",
  verified: true,
  added: "2026-06-11",
};

describe("normalizeGreenhouse", () => {
  const postings = normalizeGreenhouse(xendit, greenhouseRaw);

  it("returns one posting per job", () => {
    expect(postings).toHaveLength(22);
  });

  it("maps fields and converts dates to ISO UTC", () => {
    const dragonpay = postings.find((p) => p.title.includes("DragonPay"))!;
    expect(dragonpay).toMatchObject({
      company: "Xendit",
      source: "greenhouse",
      title: "Financial Operations Lead - DragonPay Team",
      locations: ["Manila, Philippines"],
      url: "https://www.xendit.co/en/careers/job-application/?gh_jid=7681605003",
      employmentType: "unknown",
      salary: null,
      publishedAt: "2026-04-10T11:41:32.000Z",
    });
  });

  it("splits multi-location strings on semicolons", () => {
    const multi = postings.find((p) =>
      p.title.startsWith("Customer Success Generalist"),
    )!;
    expect(multi.locations).toEqual(["Jakarta, Indonesia", "Manila, Philippines"]);
  });

  it("uses the registry display name, not the payload company_name", () => {
    const renamed: RegistryCompany = { ...xendit, name: "Xendit Philippines" };
    const [first] = normalizeGreenhouse(renamed, greenhouseRaw);
    expect(first!.company).toBe("Xendit Philippines");
  });

  it("emits no description text or other forbidden fields", () => {
    const serialized = JSON.stringify(postings);
    expect(serialized).not.toMatch(/data_compliance|internal_job_id|content/);
  });
});

describe("normalizeLever", () => {
  const postings = normalizeLever(ninjaVan, leverRaw);

  it("returns one posting per raw posting", () => {
    expect(postings).toHaveLength(12);
  });

  it("maps fields, workplaceType, commitment and epoch dates", () => {
    const intern = postings.find((p) => p.title === "Employee Relations Intern")!;
    expect(intern).toMatchObject({
      company: "Ninja Van",
      source: "lever",
      locations: ["Taguig, Philippines"],
      url: "https://jobs.lever.co/ninjavan/6f9691c0-11e0-4c98-bb25-8e0533cde1fd",
      workSetup: "hybrid",
      employmentType: "internship",
      publishedAt: "2026-04-29T07:39:50.169Z",
    });
  });

  it("formats a published salary range verbatim and leaves others null", () => {
    const withSalary = postings.find((p) => p.title.includes("Pre-Sales Salesman"))!;
    expect(withSalary.salary).toBe("2400–2500 MYR per month");
    const withoutSalary = postings.find((p) => p.title === "Employee Relations Intern")!;
    expect(withoutSalary.salary).toBeNull();
  });

  it("never lets job-description text through", () => {
    const serialized = JSON.stringify(postings);
    expect(serialized).not.toContain("[truncated for fixture");
    expect(serialized).not.toMatch(/description|additional|opening|lists/);
  });
});
