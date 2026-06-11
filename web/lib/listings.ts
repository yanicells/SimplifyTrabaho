// Build-time data layer (SPEC §12): reads data/listings.json, fails the build on
// missing/invalid data, and trims the payload to active listings with only the
// fields the UI uses.

import { readFileSync } from "node:fs";
import path from "node:path";
import { isPhilippineLocation } from "../../pipeline/src/filter";
import type {
  JobFunction,
  Level,
  Listing,
  ListingsFile,
  WorkSetup,
} from "../../pipeline/src/types";

/** One listing as shipped to the browser — nothing more than the UI renders. */
export interface Job {
  company: string;
  title: string;
  locations: string[];
  workSetup: WorkSetup;
  level: Level;
  function: JobFunction;
  /** Official application URL — also serves as the React key (unique per listing). */
  url: string;
  /** Verbatim published range; omitted when the ATS doesn't publish one. */
  salary?: string;
  /** Day precision is all the UI needs (YYYY-MM-DD, UTC). */
  posted: string;
}

export interface JobsPayload {
  /** ISO 8601 UTC of the last pipeline run — the stable "now" for relative dates. */
  updatedAt: string;
  jobs: Job[];
}

const WORK_SETUPS: readonly WorkSetup[] = ["onsite", "hybrid", "remote", "unknown"];
const LEVELS: readonly Level[] = ["internship", "entry", "mid", "senior", "unknown"];
const FUNCTIONS: readonly JobFunction[] = [
  "engineering",
  "data",
  "design",
  "product",
  "marketing",
  "sales",
  "finance",
  "hr",
  "operations",
  "customer-support",
  "legal",
  "other",
];
const SOURCES = ["greenhouse", "lever", "ashby", "workable", "smartrecruiters", "recruitee"];

function fail(where: string, problem: string): never {
  throw new Error(`listings.json invalid: ${where} ${problem}`);
}

function requireString(obj: Record<string, unknown>, where: string, field: string): string {
  const value = obj[field];
  if (typeof value !== "string" || value === "") {
    fail(`${where}.${field}`, "must be a non-empty string");
  }
  return value;
}

function requireDate(obj: Record<string, unknown>, where: string, field: string): string {
  const value = requireString(obj, where, field);
  if (Number.isNaN(Date.parse(value))) {
    fail(`${where}.${field}`, `is not a parseable date: ${JSON.stringify(value)}`);
  }
  return value;
}

function requireEnum<T extends string>(
  obj: Record<string, unknown>,
  where: string,
  field: string,
  allowed: readonly T[],
): T {
  const value = obj[field];
  if (typeof value !== "string" || !(allowed as readonly string[]).includes(value)) {
    fail(`${where}.${field}`, `must be one of ${allowed.join(", ")}`);
  }
  return value as T;
}

function parseListing(raw: unknown, index: number): Listing {
  const where = `listings[${index}]`;
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    fail(where, "must be an object");
  }
  const obj = raw as Record<string, unknown>;

  const locations = obj.locations;
  if (!Array.isArray(locations) || locations.some((l) => typeof l !== "string")) {
    fail(`${where}.locations`, "must be an array of strings");
  }
  if (obj.salary !== null && typeof obj.salary !== "string") {
    fail(`${where}.salary`, "must be a string or null");
  }
  if (typeof obj.active !== "boolean") {
    fail(`${where}.active`, "must be a boolean");
  }

  return {
    id: requireString(obj, where, "id"),
    company: requireString(obj, where, "company"),
    title: requireString(obj, where, "title"),
    locations: locations as string[],
    workSetup: requireEnum(obj, where, "workSetup", WORK_SETUPS),
    level: requireEnum(obj, where, "level", LEVELS),
    function: requireEnum(obj, where, "function", FUNCTIONS),
    url: requireString(obj, where, "url"),
    source: requireEnum(obj, where, "source", SOURCES) as Listing["source"],
    employmentType: requireEnum(obj, where, "employmentType", [
      "full-time",
      "part-time",
      "contract",
      "internship",
      "unknown",
    ]),
    salary: obj.salary as string | null,
    datePosted: requireDate(obj, where, "datePosted"),
    dateUpdated: requireDate(obj, where, "dateUpdated"),
    active: obj.active,
  };
}

/** Validates the whole file shape; throws (failing the build) on any deviation. */
export function parseListingsFile(raw: unknown): ListingsFile {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    fail("file", "must be a JSON object");
  }
  const obj = raw as Record<string, unknown>;
  if (obj.version !== 1) {
    fail("version", "must be 1");
  }
  requireDate(obj, "file", "updatedAt");
  if (!Array.isArray(obj.listings)) {
    fail("listings", "must be an array");
  }
  return {
    version: 1,
    updatedAt: obj.updatedAt as string,
    listings: obj.listings.map(parseListing),
  };
}

/** Active listings only, trimmed to UI fields, newest first (then company asc). */
export function toJobs(file: ListingsFile): JobsPayload {
  const jobs = file.listings
    .filter((l) => l.active)
    .sort(
      (a, b) =>
        b.datePosted.localeCompare(a.datePosted) || a.company.localeCompare(b.company),
    )
    .map((l) => {
      const job: Job = {
        company: l.company,
        title: l.title,
        // PH locations first so they never hide behind the UI's "+N" truncation.
        locations: [...l.locations].sort(
          (a, b) => Number(isPhilippineLocation(b)) - Number(isPhilippineLocation(a)),
        ),
        workSetup: l.workSetup,
        level: l.level,
        function: l.function,
        url: l.url,
        posted: l.datePosted.slice(0, 10),
      };
      if (l.salary !== null) {
        job.salary = l.salary;
      }
      return job;
    });
  return { updatedAt: file.updatedAt, jobs };
}

export { timeAgo } from "./time";

/** Build-time entry point: missing file, bad JSON, or bad schema all throw. */
export function loadJobs(): JobsPayload {
  const dataPath = path.join(process.cwd(), "..", "data", "listings.json");
  let raw: string;
  try {
    raw = readFileSync(dataPath, "utf8");
  } catch (cause) {
    throw new Error(`listings.json missing or unreadable at ${dataPath}`, { cause });
  }
  return toJobs(parseListingsFile(JSON.parse(raw)));
}
