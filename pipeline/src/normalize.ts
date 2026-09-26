import type { EmploymentType, FetchedPosting, RegistryCompany, WorkSetup } from "./types.js";

// Raw ATS payload → FetchedPosting. Only the whitelisted fact fields below are ever
// read — job-description text, compliance blobs, and anything resembling personal
// data never leave this module (SPEC §3.3/§3.6).

function toIsoUtc(value: string | number | null | undefined): string | null {
  if (value === null || value === undefined || value === "") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/** Keyword fallback for ATSs without a structured remote/hybrid field. */
function workSetupFromText(text: string): WorkSetup {
  if (/\bremote\b/i.test(text)) return "remote";
  if (/\bhybrid\b/i.test(text)) return "hybrid";
  if (/\bon-?site\b/i.test(text)) return "onsite";
  return "unknown";
}

interface GreenhouseJob {
  title?: unknown;
  absolute_url?: unknown;
  location?: { name?: unknown };
  first_published?: unknown;
}

export function normalizeGreenhouse(company: RegistryCompany, raw: unknown): FetchedPosting[] {
  const jobs = (raw as { jobs?: unknown })?.jobs;
  if (!Array.isArray(jobs)) {
    throw new Error(`greenhouse payload for ${company.slug} has no jobs array`);
  }
  return jobs.map((job: GreenhouseJob) => {
    const title = String(job.title ?? "");
    const locationName = String(job.location?.name ?? "");
    const locations = locationName
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean);
    return {
      company: company.name,
      source: "greenhouse",
      title,
      locations,
      url: String(job.absolute_url ?? ""),
      workSetup: workSetupFromText(`${title} ${locationName}`),
      employmentType: "unknown",
      salary: null,
      publishedAt: toIsoUtc(job.first_published as string | null | undefined),
      industry: company.industry,
      companyType: company.type,
    } satisfies FetchedPosting;
  });
}

function mapLeverWorkplace(value: unknown): WorkSetup {
  switch (String(value ?? "").toLowerCase()) {
    case "remote":
      return "remote";
    case "hybrid":
      return "hybrid";
    case "onsite":
    case "on-site":
      return "onsite";
    default:
      return "unknown";
  }
}

function mapCommitment(value: unknown): EmploymentType {
  const commitment = String(value ?? "").toLowerCase();
  if (commitment.includes("intern")) return "internship";
  if (commitment.includes("part")) return "part-time";
  if (commitment.includes("contract")) return "contract";
  if (commitment.includes("full")) return "full-time";
  return "unknown";
}

interface BambooHrJob {
  id?: unknown;
  jobOpeningName?: unknown;
  employmentStatusLabel?: unknown;
  isRemote?: unknown;
  location?: { city?: unknown; state?: unknown };
  atsLocation?: { country?: unknown; province?: unknown; state?: unknown; city?: unknown };
}

function mapBambooEmployment(label: string): EmploymentType {
  const l = label.toLowerCase();
  if (l.includes("intern")) return "internship";
  if (l.includes("part")) return "part-time";
  if (l.includes("contract") || l.includes("contractor")) return "contract";
  if (l.includes("full") || l.includes("regular") || l.includes("probationary"))
    return "full-time";
  return "unknown";
}

export function normalizeBambooHr(company: RegistryCompany, raw: unknown): FetchedPosting[] {
  const result = (raw as { result?: unknown })?.result;
  if (!Array.isArray(result)) {
    throw new Error(`bamboohr payload for ${company.slug} has no result array`);
  }
  return result.map((job: BambooHrJob) => {
    const ats = job.atsLocation ?? {};
    const loc = job.location ?? {};
    // Prefer the structured atsLocation (has country); fall back to location {city,state}.
    const parts = [
      String(ats.city ?? loc.city ?? "").trim(),
      String(ats.province ?? ats.state ?? loc.state ?? "").trim(),
      String(ats.country ?? "").trim(),
    ].filter(Boolean);
    const locations = parts.length > 0 ? [parts.join(", ")] : [];
    const title = String(job.jobOpeningName ?? "");
    return {
      company: company.name,
      source: "bamboohr",
      title,
      locations,
      url: `https://${company.slug}.bamboohr.com/careers/${String(job.id ?? "")}`,
      workSetup:
        job.isRemote === true
          ? "remote"
          : workSetupFromText(`${title} ${locations.join(" ")}`),
      employmentType: mapBambooEmployment(String(job.employmentStatusLabel ?? "")),
      salary: null,
      publishedAt: null, // list feed carries no published date (SPEC §6 first-seen fallback)
      industry: company.industry,
      companyType: company.type,
    } satisfies FetchedPosting;
  });
}

interface BreezyJob {
  name?: unknown;
  url?: unknown;
  published_date?: unknown;
  type?: { name?: unknown };
  salary?: unknown;
  location?: {
    name?: unknown;
    city?: unknown;
    is_remote?: unknown;
    country?: { name?: unknown };
  };
}

export function normalizeBreezy(company: RegistryCompany, raw: unknown): FetchedPosting[] {
  if (!Array.isArray(raw)) {
    throw new Error(`breezy payload for ${company.slug} is not a postings array`);
  }
  return raw.map((job: BreezyJob) => {
    const loc = job.location ?? {};
    const locationName =
      String(loc.name ?? "").trim() ||
      [String(loc.city ?? "").trim(), String(loc.country?.name ?? "").trim()]
        .filter(Boolean)
        .join(", ");
    const salary =
      typeof job.salary === "string" && job.salary.trim() !== "" ? job.salary.trim() : null;
    return {
      company: company.name,
      source: "breezy",
      title: String(job.name ?? ""),
      locations: locationName ? [locationName] : [],
      url: String(job.url ?? ""),
      workSetup: loc.is_remote === true ? "remote" : workSetupFromText(locationName),
      employmentType: mapCommitment(job.type?.name),
      salary,
      publishedAt: toIsoUtc(job.published_date as string | null | undefined),
      industry: company.industry,
      companyType: company.type,
    } satisfies FetchedPosting;
  });
}

interface ManatalJob {
  hash?: unknown;
  position_name?: unknown;
  country?: unknown;
  state?: unknown;
  city?: unknown;
  // `description` (JD HTML) is intentionally NOT in this interface — never read it.
}

export function normalizeManatal(company: RegistryCompany, raw: unknown): FetchedPosting[] {
  const results = (raw as { results?: unknown })?.results;
  if (!Array.isArray(results)) {
    throw new Error(`manatal payload for ${company.slug} has no results array`);
  }
  return results.map((job: ManatalJob) => {
    const locationParts = [
      String(job.city ?? "").trim(),
      String(job.state ?? "").trim(),
      String(job.country ?? "").trim(),
    ].filter(Boolean);
    const locations = locationParts.length > 0 ? [locationParts.join(", ")] : [];
    const title = String(job.position_name ?? "");
    return {
      company: company.name,
      source: "manatal",
      title,
      locations,
      url: `https://www.careers-page.com/${encodeURIComponent(company.slug)}/job/${String(job.hash ?? "")}`,
      workSetup: workSetupFromText(`${title} ${locations.join(" ")}`),
      employmentType: "unknown",
      salary: null,
      publishedAt: null, // list feed carries no published date
      industry: company.industry,
      companyType: company.type,
    } satisfies FetchedPosting;
  });
}

interface LeverSalaryRange {
  min?: unknown;
  max?: unknown;
  currency?: unknown;
  interval?: unknown;
}

function formatLeverSalary(range: LeverSalaryRange | null | undefined): string | null {
  if (!range || typeof range.min !== "number" || typeof range.max !== "number") {
    return null;
  }
  const interval = String(range.interval ?? "")
    .replace(/-salary$/, "")
    .replace(/-/g, " ");
  const currency = String(range.currency ?? "").trim();
  return [`${range.min}–${range.max}`, currency, interval].filter(Boolean).join(" ");
}

interface AshbyJob {
  title?: unknown;
  location?: unknown;
  secondaryLocations?: Array<{ location?: unknown }>;
  publishedAt?: unknown;
  isListed?: unknown;
  isRemote?: unknown;
  workplaceType?: unknown;
  employmentType?: unknown;
  jobUrl?: unknown;
  compensation?: {
    scrapeableCompensationSalarySummary?: unknown;
    compensationTierSummary?: unknown;
  } | null;
}

export function normalizeAshby(company: RegistryCompany, raw: unknown): FetchedPosting[] {
  const jobs = (raw as { jobs?: unknown })?.jobs;
  if (!Array.isArray(jobs)) {
    throw new Error(`ashby payload for ${company.slug} has no jobs array`);
  }
  return jobs
    .filter((job: AshbyJob) => job.isListed !== false)
    .map((job: AshbyJob) => {
      const locations = [
        String(job.location ?? ""),
        ...(job.secondaryLocations ?? []).map((s) => String(s.location ?? "")),
      ].filter(Boolean);
      const workplace = String(job.workplaceType ?? "").toLowerCase();
      const workSetup =
        workplace === "remote" || job.isRemote === true
          ? "remote"
          : workplace === "hybrid"
            ? "hybrid"
            : workplace === "onsite" || workplace === "on-site"
              ? "onsite"
              : "unknown";
      const summary =
        job.compensation?.scrapeableCompensationSalarySummary ??
        job.compensation?.compensationTierSummary;
      return {
        company: company.name,
        source: "ashby",
        title: String(job.title ?? ""),
        locations,
        url: String(job.jobUrl ?? ""),
        workSetup,
        employmentType: mapCommitment(job.employmentType),
        salary: typeof summary === "string" && summary !== "" ? summary : null,
        publishedAt: toIsoUtc(job.publishedAt as string | null | undefined),
        industry: company.industry,
        companyType: company.type,
      } satisfies FetchedPosting;
    });
}

interface WorkableJob {
  title?: unknown;
  url?: unknown;
  telecommuting?: unknown;
  employment_type?: unknown;
  published_on?: unknown;
  created_at?: unknown;
  country?: unknown;
  city?: unknown;
  locations?: Array<{ country?: unknown; city?: unknown }>;
}

export function normalizeWorkable(company: RegistryCompany, raw: unknown): FetchedPosting[] {
  const jobs = (raw as { jobs?: unknown })?.jobs;
  if (!Array.isArray(jobs)) {
    throw new Error(`workable payload for ${company.slug} has no jobs array`);
  }
  return jobs.map((job: WorkableJob) => {
    const fromList = (job.locations ?? [])
      .map((entry) => {
        const city = String(entry.city ?? "").trim();
        const country = String(entry.country ?? "").trim();
        return city && country ? `${city}, ${country}` : country || city;
      })
      .filter(Boolean);
    const fallback = [String(job.city ?? "").trim(), String(job.country ?? "").trim()]
      .filter(Boolean)
      .join(", ");
    const locations = fromList.length > 0 ? fromList : fallback ? [fallback] : [];
    return {
      company: company.name,
      source: "workable",
      title: String(job.title ?? ""),
      locations,
      url: String(job.url ?? ""),
      workSetup: job.telecommuting === true ? "remote" : "unknown",
      employmentType: mapCommitment(job.employment_type),
      salary: null,
      publishedAt: toIsoUtc((job.published_on ?? job.created_at) as string | null | undefined),
      industry: company.industry,
      companyType: company.type,
    } satisfies FetchedPosting;
  });
}

interface SmartRecruitersPosting {
  id?: unknown;
  name?: unknown;
  releasedDate?: unknown;
  typeOfEmployment?: { label?: unknown };
  location?: {
    city?: unknown;
    region?: unknown;
    country?: unknown;
    remote?: unknown;
    hybrid?: unknown;
    fullLocation?: unknown;
  };
}

export function normalizeSmartRecruiters(
  company: RegistryCompany,
  raw: unknown,
): FetchedPosting[] {
  const content = (raw as { content?: unknown })?.content;
  if (!Array.isArray(content)) {
    throw new Error(`smartrecruiters payload for ${company.slug} has no content array`);
  }
  return content.map((posting: SmartRecruitersPosting) => {
    const location = posting.location ?? {};
    // fullLocation can contain empty segments ("Manila, , Philippines") — clean them
    const full = String(location.fullLocation ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .join(", ");
    const fallback = [
      String(location.city ?? "").trim(),
      String(location.country ?? "")
        .trim()
        .toUpperCase(),
    ]
      .filter(Boolean)
      .join(", ");
    const workSetup =
      location.remote === true ? "remote" : location.hybrid === true ? "hybrid" : "onsite";
    return {
      company: company.name,
      source: "smartrecruiters",
      title: String(posting.name ?? ""),
      locations: [full || fallback].filter(Boolean),
      url: `https://jobs.smartrecruiters.com/${encodeURIComponent(company.slug)}/${String(posting.id ?? "")}`,
      workSetup,
      employmentType: mapCommitment(posting.typeOfEmployment?.label),
      salary: null,
      publishedAt: toIsoUtc(posting.releasedDate as string | null | undefined),
      industry: company.industry,
      companyType: company.type,
    } satisfies FetchedPosting;
  });
}

/** Recruitee dates look like "2026-04-23 18:30:57 UTC" — convert to ISO before parsing. */
function recruiteeDate(value: unknown): string | null {
  if (typeof value !== "string" || value === "") return null;
  return toIsoUtc(value.replace(" UTC", "Z").replace(" ", "T"));
}

interface RecruiteeOffer {
  title?: unknown;
  careers_url?: unknown;
  published_at?: unknown;
  created_at?: unknown;
  remote?: unknown;
  hybrid?: unknown;
  on_site?: unknown;
  employment_type_code?: unknown;
  country?: unknown;
  city?: unknown;
  salary?: { min?: unknown; max?: unknown; currency?: unknown; period?: unknown } | null;
  locations?: Array<{ city?: unknown; country?: unknown }>;
}

function formatRecruiteeSalary(salary: RecruiteeOffer["salary"]): string | null {
  if (!salary) return null;
  const min = Number(salary.min);
  const max = Number(salary.max);
  if (!Number.isFinite(min) || !Number.isFinite(max) || salary.min === null) return null;
  return [
    `${min}–${max}`,
    String(salary.currency ?? "").trim(),
    String(salary.period ?? "").trim(),
  ]
    .filter(Boolean)
    .join(" ");
}

export function normalizeRecruitee(company: RegistryCompany, raw: unknown): FetchedPosting[] {
  const offers = (raw as { offers?: unknown })?.offers;
  if (!Array.isArray(offers)) {
    throw new Error(`recruitee payload for ${company.slug} has no offers array`);
  }
  return offers.map((offer: RecruiteeOffer) => {
    const fromList = (offer.locations ?? [])
      .map((entry) => {
        const city = String(entry.city ?? "").trim();
        const country = String(entry.country ?? "").trim();
        return city && country ? `${city}, ${country}` : country || city;
      })
      .filter(Boolean);
    const fallback = [String(offer.city ?? "").trim(), String(offer.country ?? "").trim()]
      .filter(Boolean)
      .join(", ");
    const workSetup =
      offer.remote === true
        ? "remote"
        : offer.hybrid === true
          ? "hybrid"
          : offer.on_site === true
            ? "onsite"
            : "unknown";
    return {
      company: company.name,
      source: "recruitee",
      title: String(offer.title ?? ""),
      locations: fromList.length > 0 ? fromList : fallback ? [fallback] : [],
      url: String(offer.careers_url ?? ""),
      workSetup,
      employmentType: mapCommitment(offer.employment_type_code),
      salary: formatRecruiteeSalary(offer.salary),
      publishedAt: recruiteeDate(offer.published_at ?? offer.created_at),
      industry: company.industry,
      companyType: company.type,
    } satisfies FetchedPosting;
  });
}

interface LeverPosting {
  text?: unknown;
  hostedUrl?: unknown;
  createdAt?: unknown;
  workplaceType?: unknown;
  salaryRange?: LeverSalaryRange;
  categories?: { location?: unknown; commitment?: unknown; allLocations?: unknown };
}

export function normalizeLever(company: RegistryCompany, raw: unknown): FetchedPosting[] {
  if (!Array.isArray(raw)) {
    throw new Error(`lever payload for ${company.slug} is not a postings array`);
  }
  return raw.map((posting: LeverPosting) => {
    const categories = posting.categories ?? {};
    const all = Array.isArray(categories.allLocations)
      ? categories.allLocations.map(String)
      : [];
    const locations =
      all.length > 0 ? all : [String(categories.location ?? "")].filter(Boolean);
    return {
      company: company.name,
      source: "lever",
      title: String(posting.text ?? ""),
      locations,
      url: String(posting.hostedUrl ?? ""),
      workSetup: mapLeverWorkplace(posting.workplaceType),
      employmentType: mapCommitment(categories.commitment),
      salary: formatLeverSalary(posting.salaryRange),
      publishedAt: toIsoUtc(posting.createdAt as number | null | undefined),
      industry: company.industry,
      companyType: company.type,
    } satisfies FetchedPosting;
  });
}

/** Workday registry slug: `{tenant}.wd{n}/{site}` (SPEC §17), e.g. `globe.wd3/GLB_Careers`. */
export function parseWorkdaySlug(slug: string): {
  tenant: string;
  host: string;
  site: string;
} {
  const match = /^([a-z0-9-]+)\.(wd\d+)\/([A-Za-z0-9_-]+)$/.exec(slug);
  const [, tenant, wdHost, site] = match ?? [];
  if (tenant === undefined || wdHost === undefined || site === undefined) {
    throw new Error(`invalid workday slug "${slug}" — expected {tenant}.wd{n}/{site}`);
  }
  return {
    tenant,
    host: `${tenant}.${wdHost}.myworkdayjobs.com`,
    site,
  };
}

interface WorkdayJob {
  title?: unknown;
  externalPath?: unknown;
  locationsText?: unknown;
  timeType?: unknown;
  // postedOn is relative text ("Posted 3 Days Ago") — not a fact we store;
  // datePosted falls back to first-seen (SPEC §6). No JD text in the list feed.
}

export function normalizeWorkday(
  company: RegistryCompany,
  jobs: unknown[],
  options: {
    /**
     * True when the jobs were fetched under the tenant's own Philippines
     * country facet (§17.1.4). Faceted responses omit locationsText — the facet
     * itself is the location fact, so those items get "Philippines".
     */
    assumePhilippines?: boolean;
  } = {},
): FetchedPosting[] {
  const { host, site } = parseWorkdaySlug(company.slug);
  return jobs.map((raw) => {
    const job = raw as WorkdayJob;
    const title = String(job.title ?? "");
    const locationsText = String(job.locationsText ?? "").trim();
    const locations =
      locationsText !== ""
        ? [locationsText]
        : options.assumePhilippines
          ? ["Philippines"]
          : [];
    return {
      company: company.name,
      source: "workday",
      title,
      locations,
      url: `https://${host}/en-US/${site}${String(job.externalPath ?? "")}`,
      workSetup: workSetupFromText(`${title} ${locationsText}`),
      employmentType: mapCommitment(job.timeType),
      salary: null,
      publishedAt: null,
      industry: company.industry,
      companyType: company.type,
    } satisfies FetchedPosting;
  });
}

interface PinpointPosting {
  title?: unknown;
  url?: unknown;
  workplace_type?: unknown;
  employment_type?: unknown;
  compensation?: unknown;
  compensation_visible?: unknown;
  location?: { name?: unknown; city?: unknown; province?: unknown };
  // description / key_responsibilities / benefits / skills_knowledge_expertise (JD
  // text) and reporting_to are intentionally NOT in this interface — never read them.
}

function mapPinpointEmployment(value: unknown): EmploymentType {
  const type = String(value ?? "").toLowerCase();
  if (type.includes("intern")) return "internship";
  if (type.includes("part_time")) return "part-time";
  if (type.includes("contract") || type.includes("freelance") || type.includes("temp"))
    return "contract";
  if (type.includes("full_time")) return "full-time";
  return "unknown";
}

/**
 * Pinpoint location → one string. `name` is the employer's own label ("Philippines",
 * "Remote Philippines (Bacolod)", "Philippines - UPL"); city/province are prepended
 * only when the label doesn't already contain them. Placeholders ("", ".", "-") drop.
 */
function pinpointLocation(location: PinpointPosting["location"]): string {
  const clean = (value: unknown) => {
    const text = String(value ?? "").trim();
    return /^[.\-\s]*$/.test(text) ? "" : text;
  };
  const name = clean(location?.name);
  const parts: string[] = [];
  for (const part of [clean(location?.city), clean(location?.province)]) {
    const seen = [name, ...parts].join(" ").toLowerCase();
    if (part && !seen.includes(part.toLowerCase())) parts.push(part);
  }
  return [...parts, name].filter(Boolean).join(", ");
}

export function normalizePinpoint(company: RegistryCompany, raw: unknown): FetchedPosting[] {
  const data = (raw as { data?: unknown })?.data;
  if (!Array.isArray(data)) {
    throw new Error(`pinpoint payload for ${company.slug} has no data array`);
  }
  return data.map((posting: PinpointPosting) => {
    const location = pinpointLocation(posting.location);
    const compensation =
      posting.compensation_visible === true && typeof posting.compensation === "string"
        ? posting.compensation.trim()
        : "";
    return {
      company: company.name,
      source: "pinpoint",
      title: String(posting.title ?? ""),
      locations: location ? [location] : [],
      url: String(posting.url ?? ""),
      workSetup: mapLeverWorkplace(posting.workplace_type),
      employmentType: mapPinpointEmployment(posting.employment_type),
      salary: compensation || null,
      publishedAt: null, // postings.json carries no published date
      industry: company.industry,
      companyType: company.type,
    } satisfies FetchedPosting;
  });
}

interface RipplingJob {
  uuid?: unknown;
  name?: unknown;
  url?: unknown;
  workLocation?: { label?: unknown };
}

/**
 * Rippling lists a multi-location job once per location (same uuid and url), so rows
 * fold into one posting per uuid carrying all its locations, in first-seen order.
 */
export function normalizeRippling(company: RegistryCompany, raw: unknown): FetchedPosting[] {
  if (!Array.isArray(raw)) {
    throw new Error(`rippling payload for ${company.slug} is not a jobs array`);
  }
  const byId = new Map<string, { title: string; url: string; locations: string[] }>();
  for (const job of raw as RipplingJob[]) {
    const url = String(job.url ?? "");
    const label = String(job.workLocation?.label ?? "").trim();
    const key = String(job.uuid ?? url);
    const entry = byId.get(key) ?? { title: String(job.name ?? ""), url, locations: [] };
    if (label && !entry.locations.includes(label)) entry.locations.push(label);
    byId.set(key, entry);
  }
  return [...byId.values()].map(
    ({ title, url, locations }) =>
      ({
        company: company.name,
        source: "rippling",
        title,
        locations,
        url,
        workSetup: workSetupFromText(`${title} ${locations.join(" ")}`),
        employmentType: "unknown", // not in the public board feed
        salary: null,
        publishedAt: null, // not in the public board feed
        industry: company.industry,
        companyType: company.type,
      }) satisfies FetchedPosting,
  );
}

const XML_ENTITIES: Record<string, string> = { lt: "<", gt: ">", quot: '"', apos: "'" };

/** Decodes a text node: CDATA, named/numeric entities (`&amp;` last, so no double-decode). */
function decodeXml(text: string): string {
  const trimmed = text.trim();
  const cdata = /^<!\[CDATA\[([\s\S]*)\]\]>$/.exec(trimmed);
  if (cdata) return cdata[1]!.trim();
  return trimmed
    .replace(/&(#x[0-9a-f]+|#\d+|lt|gt|quot|apos);/gi, (match, entity: string) => {
      if (entity[0] !== "#") return XML_ENTITIES[entity.toLowerCase()] ?? match;
      const code =
        entity[1] === "x" || entity[1] === "X"
          ? parseInt(entity.slice(2), 16)
          : Number(entity.slice(1));
      return String.fromCodePoint(code);
    })
    .replace(/&amp;/g, "&");
}

/** Decoded text of the first `<tag>…</tag>` in `xml`; "" when absent or self-closing. */
function xmlTag(xml: string, tag: string): string {
  const match = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`).exec(xml);
  return match ? decodeXml(match[1]!) : "";
}

function mapTeamtailorRemote(value: string): WorkSetup {
  switch (value.toLowerCase()) {
    case "fully":
      return "remote";
    case "hybrid":
      return "hybrid";
    case "onsite":
      return "onsite";
    default:
      return "unknown"; // "none" / "temporary" / absent: not a clear work-setup fact
  }
}

/**
 * Teamtailor `jobs.rss` (an XML string) → postings. A minimal string parser is enough
 * for the flat items Teamtailor emits. Each item's `<description>` (JD HTML) is cut
 * out before any field is read, so it can never leak into a posting.
 */
export function normalizeTeamtailor(company: RegistryCompany, raw: unknown): FetchedPosting[] {
  if (typeof raw !== "string" || !/<rss[\s>]/.test(raw) || !raw.includes("<channel>")) {
    throw new Error(`teamtailor payload for ${company.slug} is not an RSS feed`);
  }
  const items = raw.match(/<item>[\s\S]*?<\/item>/g) ?? [];
  return items.map((rawItem) => {
    const item = rawItem.replace(/<description>[\s\S]*?<\/description>/g, "");
    const locations = (item.match(/<tt:location>[\s\S]*?<\/tt:location>/g) ?? [])
      .map((location) => {
        const city = xmlTag(location, "tt:city");
        const country = xmlTag(location, "tt:country");
        return city && country
          ? `${city}, ${country}`
          : xmlTag(location, "tt:name") || country;
      })
      .filter(Boolean);
    const title = xmlTag(item, "title");
    const remote = mapTeamtailorRemote(xmlTag(item, "remoteStatus"));
    return {
      company: company.name,
      source: "teamtailor",
      title,
      locations: [...new Set(locations)],
      url: xmlTag(item, "link"),
      workSetup:
        remote !== "unknown" ? remote : workSetupFromText(`${title} ${locations.join(" ")}`),
      employmentType: "unknown", // not in the RSS feed
      salary: null,
      publishedAt: toIsoUtc(xmlTag(item, "pubDate")),
      industry: company.industry,
      companyType: company.type,
    } satisfies FetchedPosting;
  });
}
