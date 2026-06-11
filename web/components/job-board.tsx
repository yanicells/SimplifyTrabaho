"use client";

import { useDeferredValue, useMemo, useState } from "react";
import type { Job } from "@/lib/listings";
import { timeAgo } from "@/lib/time";

const PAGE_SIZE = 60;
const NEW_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;

type LevelChoice = "featured" | "all" | "internship" | "entry" | "mid" | "senior";

const LEVEL_CHIPS: { id: LevelChoice; label: string }[] = [
  { id: "featured", label: "Interns & fresh grads" },
  { id: "all", label: "All roles" },
  { id: "internship", label: "Internships" },
  { id: "entry", label: "Entry level" },
  { id: "mid", label: "Mid-level" },
  { id: "senior", label: "Senior" },
];

const FUNCTION_OPTIONS: { id: Job["function"]; label: string }[] = [
  { id: "engineering", label: "Engineering" },
  { id: "data", label: "Data & AI" },
  { id: "design", label: "Design" },
  { id: "product", label: "Product" },
  { id: "marketing", label: "Marketing" },
  { id: "sales", label: "Sales" },
  { id: "finance", label: "Finance" },
  { id: "hr", label: "HR & People" },
  { id: "operations", label: "Operations" },
  { id: "customer-support", label: "Customer support" },
  { id: "legal", label: "Legal" },
  { id: "other", label: "Other" },
];

const SETUP_OPTIONS: { id: Job["workSetup"]; label: string }[] = [
  { id: "remote", label: "Remote" },
  { id: "hybrid", label: "Hybrid" },
  { id: "onsite", label: "On-site" },
];

const LEVEL_PILLS: Partial<Record<Job["level"], string>> = {
  internship: "Internship",
  entry: "Entry level",
  mid: "Mid-level",
  senior: "Senior",
};

const SETUP_PILLS: Partial<Record<Job["workSetup"], string>> = {
  remote: "Remote",
  hybrid: "Hybrid",
  onsite: "On-site",
};

export function JobBoard({ jobs, updatedAt }: { jobs: Job[]; updatedAt: string }) {
  const [level, setLevel] = useState<LevelChoice>("featured");
  const [fn, setFn] = useState<"all" | Job["function"]>("all");
  const [setup, setSetup] = useState<"all" | Job["workSetup"]>("all");
  const [location, setLocation] = useState("");
  const [query, setQuery] = useState("");
  const [visible, setVisible] = useState(PAGE_SIZE);

  // Typing stays responsive: the row list re-filters against the deferred values.
  const deferredQuery = useDeferredValue(query);
  const deferredLocation = useDeferredValue(location);

  const searchKeys = useMemo(
    () => jobs.map((j) => `${j.company} ${j.title}`.toLowerCase()),
    [jobs],
  );
  const locationKeys = useMemo(
    () => jobs.map((j) => j.locations.join("; ").toLowerCase()),
    [jobs],
  );

  const filtered = useMemo(() => {
    // Every word must match somewhere in company+title, so "software intern"
    // finds "Software Engineering Intern".
    const terms = deferredQuery.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const loc = deferredLocation.trim().toLowerCase();
    const out: Job[] = [];
    for (let i = 0; i < jobs.length; i++) {
      const job = jobs[i];
      if (level === "featured") {
        if (job.level !== "internship" && job.level !== "entry") continue;
      } else if (level !== "all" && job.level !== level) {
        continue;
      }
      if (fn !== "all" && job.function !== fn) continue;
      if (setup !== "all" && job.workSetup !== setup) continue;
      if (loc !== "" && !locationKeys[i].includes(loc)) continue;
      if (terms.length > 0 && !terms.every((t) => searchKeys[i].includes(t))) continue;
      out.push(job);
    }
    return out;
  }, [jobs, searchKeys, locationKeys, level, fn, setup, deferredLocation, deferredQuery]);

  const isDefaultView =
    level === "featured" && fn === "all" && setup === "all" && location === "" && query === "";

  function reset() {
    setLevel("featured");
    setFn("all");
    setSetup("all");
    setLocation("");
    setQuery("");
    setVisible(PAGE_SIZE);
  }

  const shown = filtered.slice(0, visible);
  const updatedMs = Date.parse(updatedAt);

  const fieldClass =
    "h-11 rounded-lg border border-line bg-white px-3 text-sm text-ink placeholder:text-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20";

  return (
    <div className="pb-12">
      {/* Search */}
      <div className="relative mt-5">
        <svg
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden
          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-faint"
        >
          <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
          <path d="m11 11 3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setVisible(PAGE_SIZE);
          }}
          placeholder="Search roles or companies…"
          aria-label="Search roles or companies"
          className={`${fieldClass} w-full pl-10`}
        />
      </div>

      {/* Level chips — featured (interns + entry level) is the default view */}
      <div
        role="group"
        aria-label="Filter by level"
        className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0"
      >
        {LEVEL_CHIPS.map((chip) => {
          const active = level === chip.id;
          return (
            <button
              key={chip.id}
              type="button"
              aria-pressed={active}
              onClick={() => {
                setLevel(chip.id);
                setVisible(PAGE_SIZE);
              }}
              className={`shrink-0 rounded-full border px-3.5 py-2 text-sm font-medium transition-colors ${
                active
                  ? "border-ink bg-ink text-paper"
                  : "border-line bg-white text-ink hover:border-faint"
              }`}
            >
              {chip.id === "featured" && (
                <span aria-hidden className={`mr-1 ${active ? "text-sun" : "text-faint"}`}>
                  ✶
                </span>
              )}
              {chip.label}
            </button>
          );
        })}
      </div>

      {/* Function / work setup / location */}
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        <select
          value={fn}
          onChange={(e) => {
            setFn(e.target.value as typeof fn);
            setVisible(PAGE_SIZE);
          }}
          aria-label="Filter by function"
          className={`select ${fieldClass} pr-8`}
        >
          <option value="all">Any function</option>
          {FUNCTION_OPTIONS.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
        <select
          value={setup}
          onChange={(e) => {
            setSetup(e.target.value as typeof setup);
            setVisible(PAGE_SIZE);
          }}
          aria-label="Filter by work setup"
          className={`select ${fieldClass} pr-8`}
        >
          <option value="all">Any setup</option>
          {SETUP_OPTIONS.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={location}
          onChange={(e) => {
            setLocation(e.target.value);
            setVisible(PAGE_SIZE);
          }}
          placeholder="Location, e.g. Cebu"
          aria-label="Filter by location"
          className={`${fieldClass} col-span-2 sm:col-span-1`}
        />
      </div>

      {/* Result count */}
      <div className="mt-5 flex items-baseline justify-between gap-3">
        <p aria-live="polite" className="text-sm text-faint">
          <span className="font-semibold text-ink">{filtered.length.toLocaleString("en-US")}</span>{" "}
          {filtered.length === 1 ? "role" : "roles"}
          {isDefaultView ? " for interns & fresh grads" : ""} · newest first
        </p>
        {!isDefaultView && (
          <button
            type="button"
            onClick={reset}
            className="shrink-0 text-sm font-medium text-accent hover:underline"
          >
            Reset filters
          </button>
        )}
      </div>

      {/* Listings */}
      {shown.length === 0 ? (
        <div className="border-t border-line py-16 text-center">
          <p className="font-display text-lg">Walang nahanap — no roles match.</p>
          <p className="mt-2 text-sm text-faint">
            Try fewer filters, or browse{" "}
            <button
              type="button"
              onClick={() => {
                reset();
                setLevel("all");
              }}
              className="font-medium text-accent hover:underline"
            >
              all roles
            </button>
            .
          </p>
        </div>
      ) : (
        <ul role="list" className="mt-1 divide-y divide-line border-t border-line">
          {shown.map((job) => {
            const isNew = updatedMs - Date.parse(job.posted) < NEW_WINDOW_MS;
            const levelPill = LEVEL_PILLS[job.level];
            const setupPill = SETUP_PILLS[job.workSetup];
            const extraLocations = job.locations.length - 2;
            return (
              <li key={job.url} className="job-row flex items-center gap-4 py-4">
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-[13px] text-faint">
                    <span className="font-semibold uppercase tracking-wide text-ink/80">
                      {job.company}
                    </span>
                    <span>{timeAgo(job.posted, updatedAt)}</span>
                    {isNew && (
                      <span className="rounded-full bg-sun-soft px-1.5 py-px text-[11px] font-bold text-ink">
                        New
                      </span>
                    )}
                  </p>
                  <h2 className="mt-1 text-[16px] font-semibold leading-snug sm:text-[17px]">
                    {job.title}
                  </h2>
                  <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-faint">
                    {levelPill && (
                      <span
                        className={`rounded-full px-2 py-0.5 font-medium ${
                          job.level === "internship" || job.level === "entry"
                            ? "bg-sun-soft text-ink"
                            : "border border-line"
                        }`}
                      >
                        {levelPill}
                      </span>
                    )}
                    {setupPill && (
                      <span className="rounded-full border border-line px-2 py-0.5 font-medium">
                        {setupPill}
                      </span>
                    )}
                    {job.locations.length > 0 && (
                      <span className="min-w-0 truncate">
                        {job.locations.slice(0, 2).join(" · ")}
                        {extraLocations > 0 ? ` +${extraLocations}` : ""}
                      </span>
                    )}
                    {job.salary && (
                      <span className="font-medium text-ink">{job.salary}</span>
                    )}
                  </p>
                </div>
                <a
                  href={job.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Apply to ${job.title} at ${job.company} (opens the official application page)`}
                  className="shrink-0 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-85"
                >
                  Apply
                </a>
              </li>
            );
          })}
        </ul>
      )}

      {/* Pagination */}
      {filtered.length > visible && (
        <div className="mt-6 flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={() => setVisible((v) => v + PAGE_SIZE)}
            className="rounded-full border border-line bg-white px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-faint"
          >
            Show more roles
          </button>
          <p className="text-xs text-faint">
            Showing {shown.length.toLocaleString("en-US")} of{" "}
            {filtered.length.toLocaleString("en-US")}
          </p>
        </div>
      )}
    </div>
  );
}
