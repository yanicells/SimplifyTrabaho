import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  normalizeAshby,
  normalizeGreenhouse,
  normalizeLever,
  normalizeRecruitee,
  normalizeSmartRecruiters,
  normalizeWorkable,
} from "../src/normalize.js";
import type { RegistryCompany } from "../src/types.js";

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), "fixtures");
const loadFixture = (name: string): unknown =>
  JSON.parse(readFileSync(join(fixturesDir, name), "utf8"));
const greenhouseRaw = loadFixture("greenhouse-xendit.json");
const leverRaw = loadFixture("lever-ninjavan.json");
const ashbyRaw = loadFixture("ashby-deel.json");
const workableRaw = loadFixture("workable-crewbloom.json");
const smartRecruitersRaw = loadFixture("smartrecruiters-canva.json");
const recruiteeRaw = loadFixture("recruitee-hostaway.json");

function company(overrides: Partial<RegistryCompany>): RegistryCompany {
  return {
    name: "Test Co",
    ats: "greenhouse",
    slug: "test",
    industry: "",
    type: "direct",
    verified: true,
    added: "2026-06-11",
    ...overrides,
  };
}

const xendit: RegistryCompany = {
  name: "Xendit",
  ats: "greenhouse",
  slug: "xendit",
  industry: "fintech",
  type: "direct",
  verified: true,
  added: "2026-06-11",
};

const ninjaVan: RegistryCompany = {
  name: "Ninja Van",
  ats: "lever",
  slug: "ninjavan",
  industry: "logistics",
  type: "direct",
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
      industry: "fintech",
    });
  });

  it("copies the registry industry into every posting (schema v2)", () => {
    expect(postings.every((p) => p.industry === "fintech")).toBe(true);
  });

  it("copies the registry companyType onto every posting", () => {
    const agencyCo = { ...xendit, type: "agency" as const };
    const postings = normalizeGreenhouse(agencyCo, greenhouseRaw);
    expect(postings.every((p) => p.companyType === "agency")).toBe(true);
  });

  it("splits multi-location strings on semicolons", () => {
    const multi = postings.find((p) => p.title.startsWith("Customer Success Generalist"))!;
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
      industry: "logistics",
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

describe("normalizeAshby", () => {
  const deel = company({ name: "Deel", ats: "ashby", slug: "deel" });
  const postings = normalizeAshby(deel, ashbyRaw);

  it("maps fields including secondary locations and workplaceType", () => {
    expect(postings[0]!).toMatchObject({
      company: "Deel",
      source: "ashby",
      title: "Account Executive, MM | Greater China",
      locations: ["China", "Hong Kong"],
      url: "https://jobs.ashbyhq.com/deel/1266ddd2-1ea4-4f36-8c5e-07782219575b",
      workSetup: "remote",
      employmentType: "full-time",
      publishedAt: "2026-04-18T06:48:10.213Z",
      salary: null,
      industry: "",
    });
  });

  it("skips unlisted jobs", () => {
    const raw = {
      jobs: [
        {
          title: "Hidden Role",
          location: "Manila",
          isListed: false,
          jobUrl: "https://jobs.ashbyhq.com/deel/hidden",
        },
      ],
    };
    expect(normalizeAshby(deel, raw)).toHaveLength(0);
  });

  it("uses the published compensation summary verbatim when present", () => {
    const raw = {
      jobs: [
        {
          title: "Engineer",
          location: "Remote - Philippines",
          isListed: true,
          jobUrl: "https://jobs.ashbyhq.com/deel/x",
          compensation: {
            scrapeableCompensationSalarySummary: "₱50K – ₱70K • Offers Equity",
          },
        },
      ],
    };
    expect(normalizeAshby(deel, raw)[0]!.salary).toBe("₱50K – ₱70K • Offers Equity");
  });

  it("never lets job-description text through", () => {
    expect(JSON.stringify(postings)).not.toContain("[truncated for fixture");
  });
});

describe("normalizeWorkable", () => {
  const crewBloom = company({ name: "CrewBloom", ats: "workable", slug: "crewbloom" });
  const postings = normalizeWorkable(crewBloom, workableRaw);

  it("maps fields, builds location strings, and parses date-only published_on", () => {
    expect(postings[0]!).toMatchObject({
      company: "CrewBloom",
      source: "workable",
      title: "3PL Dispatcher",
      locations: ["Philippines"],
      url: "https://apply.workable.com/j/2E122CBFAD",
      workSetup: "remote", // telecommuting: true
      employmentType: "unknown", // employment_type is ""
      salary: null,
      publishedAt: "2025-11-21T00:00:00.000Z",
    });
  });

  it("includes the city when present", () => {
    const raw = {
      name: "X",
      jobs: [
        {
          title: "Clerk",
          url: "https://apply.workable.com/j/AAA",
          telecommuting: false,
          locations: [{ country: "Philippines", city: "Makati" }],
        },
      ],
    };
    expect(normalizeWorkable(crewBloom, raw)[0]!.locations).toEqual(["Makati, Philippines"]);
  });

  it("maps published employment types", () => {
    const fullTime = postings.find((p) => p.employmentType === "full-time");
    expect(fullTime).toBeDefined();
  });
});

describe("normalizeSmartRecruiters", () => {
  const canva = company({ name: "Canva", ats: "smartrecruiters", slug: "Canva" });
  const postings = normalizeSmartRecruiters(canva, smartRecruitersRaw);

  it("maps fields and constructs the public job-ad URL", () => {
    expect(postings[0]!).toMatchObject({
      company: "Canva",
      source: "smartrecruiters",
      title: "Print Ops Specialist",
      locations: ["Manila, Philippines"], // fullLocation with empty region cleaned
      url: "https://jobs.smartrecruiters.com/Canva/6000000001130371",
      workSetup: "remote",
      employmentType: "contract",
      salary: null,
      publishedAt: "2026-06-04T00:51:34.497Z",
    });
  });

  it("maps the hybrid flag", () => {
    const raw = {
      totalFound: 1,
      content: [
        {
          id: "1",
          name: "Analyst",
          releasedDate: "2026-06-01T00:00:00.000Z",
          company: { identifier: "Canva" },
          location: {
            city: "Makati",
            country: "ph",
            remote: false,
            hybrid: true,
            fullLocation: "Makati, Philippines",
          },
        },
      ],
    };
    expect(normalizeSmartRecruiters(canva, raw)[0]!.workSetup).toBe("hybrid");
  });
});

describe("normalizeRecruitee", () => {
  const hostaway = company({ name: "Hostaway", ats: "recruitee", slug: "hostaway" });
  const postings = normalizeRecruitee(hostaway, recruiteeRaw);

  it("maps fields, parses Recruitee's date format, and uses careers_url", () => {
    expect(postings[0]!).toMatchObject({
      company: "Hostaway",
      source: "recruitee",
      title: "Partner Integrations Manager - 100% Remote - Philippines",
      locations: ["Manila, Philippines"],
      url: "https://careers.hostaway.com/o/partner-integrations-manager-100-remote-philippines",
      workSetup: "remote",
      employmentType: "full-time", // fulltime_permanent
      salary: null, // salary object present but all-null
      publishedAt: "2026-04-23T18:30:57.000Z",
    });
  });

  it("formats a published salary range and maps hybrid/onsite flags", () => {
    const raw = {
      offers: [
        {
          title: "Accountant",
          careers_url: "https://careers.example.com/o/accountant",
          published_at: "2026-06-01 08:00:00 UTC",
          on_site: true,
          remote: false,
          hybrid: false,
          employment_type_code: "fulltime",
          salary: { min: 30000, max: 40000, currency: "PHP", period: "monthly" },
          locations: [{ city: "Cebu", country: "Philippines" }],
        },
      ],
    };
    const [posting] = normalizeRecruitee(hostaway, raw);
    expect(posting!.salary).toBe("30000–40000 PHP monthly");
    expect(posting!.workSetup).toBe("onsite");
  });

  it("never lets job-description text through", () => {
    expect(JSON.stringify(postings)).not.toContain("[truncated for fixture");
  });
});
