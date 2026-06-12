"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import type { Job } from "@/lib/listings";
import {
  DEFAULT_LEVELS,
  defaultFilters,
  filtersFromSearch,
  filtersToSearch,
  SELECTABLE_FUNCTIONS,
  type Filters,
  type SelectableLevel,
} from "@/lib/filter-params";
import { timeAgo } from "@/lib/time";

const PAGE_SIZE = 60;
const NEW_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;
const URL_SYNC_DEBOUNCE_MS = 200;

// Phase 9 adds `type: direct|agency` to the registry; flip this once the data
// ships an employer type per listing. The URL param name `type` is reserved.
const EMPLOYER_TYPE_FILTER_ENABLED = false;

const LEVEL_CHIPS: { id: SelectableLevel; label: string }[] = [
  { id: "internship", label: "Internships" },
  { id: "entry", label: "Entry level" },
  { id: "mid", label: "Mid-level" },
  { id: "senior", label: "Senior" },
];

const FUNCTION_LABELS: Record<(typeof SELECTABLE_FUNCTIONS)[number], string> = {
  engineering: "Engineering",
  data: "Data & AI",
  design: "Design",
  product: "Product",
  marketing: "Marketing",
  sales: "Sales",
  finance: "Finance",
  hr: "HR & People",
  operations: "Operations",
  "customer-support": "Customer support",
  legal: "Legal",
  healthcare: "Healthcare",
  education: "Education",
  hospitality: "Hospitality",
  manufacturing: "Manufacturing",
  retail: "Retail",
  construction: "Construction & property",
  other: "Other",
};

const SETUP_OPTIONS: { id: Job["workSetup"]; label: string }[] = [
  { id: "remote", label: "Remote" },
  { id: "hybrid", label: "Hybrid" },
  { id: "onsite", label: "On-site" },
];

const METRO_OPTIONS: { id: Job["metro"][number]; label: string }[] = [
  { id: "ncr", label: "Metro Manila (NCR)" },
  { id: "cebu", label: "Cebu" },
  { id: "davao", label: "Davao" },
  { id: "clark-pampanga", label: "Clark · Pampanga" },
  { id: "calabarzon", label: "Calabarzon" },
  { id: "iloilo", label: "Iloilo" },
  { id: "bacolod", label: "Bacolod" },
  { id: "baguio", label: "Baguio" },
  { id: "cdo", label: "Cagayan de Oro" },
  { id: "remote-ph", label: "Remote (PH)" },
  { id: "other-ph", label: "Other PH" },
];

/** Registry industry tags are lowercase slugs; a few need hand-tuned labels. */
const INDUSTRY_LABELS: Record<string, string> = {
  saas: "SaaS",
  "ai-data": "AI & data",
  "hr-tech": "HR tech",
  "it-services": "IT services",
  ecommerce: "E-commerce",
};

export function industryLabel(tag: string): string {
  return (
    INDUSTRY_LABELS[tag] ??
    tag.replace(/-/g, " ").replace(/^./, (c) => c.toUpperCase())
  );
}

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

function toggle<T>(values: T[], value: T): T[] {
  return values.includes(value) ? values.filter((v) => v !== value) : [...values, value];
}

function sameSet(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((v) => b.includes(v));
}

export function JobBoard({
  jobs,
  industries,
  updatedAt,
}: {
  jobs: Job[];
  /** Unique registry industry tags present in the data, alphabetical (built server-side). */
  industries: string[];
  updatedAt: string;
}) {
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [panelOpen, setPanelOpen] = useState(false);

  // Static export renders the featured default; a pasted URL applies its filter
  // state right after hydration (the only moment location.search is knowable).
  useEffect(() => {
    const fromUrl = filtersFromSearch(window.location.search);
    if (filtersToSearch(fromUrl) !== "") {
      setFilters(fromUrl);
      // Surface the advanced panel when the link carries advanced filters.
      const { levels, query, ...advanced } = fromUrl;
      void levels;
      void query;
      if (filtersToSearch({ ...defaultFilters(), ...advanced }) !== "") {
        setPanelOpen(true);
      }
    }
  }, []);

  // Keep the address bar shareable on every change, debounced so typing in the
  // text fields doesn't hammer history.replaceState (Safari rate-limits it).
  const urlTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    if (urlTimer.current !== undefined) clearTimeout(urlTimer.current);
    urlTimer.current = setTimeout(() => {
      const search = filtersToSearch(filters);
      const url = window.location.pathname + (search === "" ? "" : `?${search}`);
      history.replaceState(null, "", url);
    }, URL_SYNC_DEBOUNCE_MS);
    return () => clearTimeout(urlTimer.current);
  }, [filters]);

  function patch(partial: Partial<Filters>) {
    setFilters((prev) => ({ ...prev, ...partial }));
    setVisible(PAGE_SIZE);
  }

  // Typing stays responsive: the row list re-filters against the deferred values.
  const deferredQuery = useDeferredValue(filters.query);
  const deferredLocation = useDeferredValue(filters.location);

  const searchKeys = useMemo(
    () => jobs.map((j) => `${j.company} ${j.title}`.toLowerCase()),
    [jobs],
  );
  const locationKeys = useMemo(
    () => jobs.map((j) => j.locations.join("; ").toLowerCase()),
    [jobs],
  );

  const { levels, fns, setup, metro, industry } = filters;
  const levelSet = useMemo(() => new Set<string>(levels), [levels]);
  const fnSet = useMemo(() => new Set<string>(fns), [fns]);

  const filtered = useMemo(() => {
    // Every word must match somewhere in company+title, so "software intern"
    // finds "Software Engineering Intern".
    const terms = deferredQuery.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const loc = deferredLocation.trim().toLowerCase();
    const out: Job[] = [];
    for (let i = 0; i < jobs.length; i++) {
      const job = jobs[i];
      if (levelSet.size > 0 && !levelSet.has(job.level)) continue;
      if (fnSet.size > 0 && !fnSet.has(job.function)) continue;
      if (setup !== "all" && job.workSetup !== setup) continue;
      if (metro !== "all" && !job.metro.includes(metro)) continue;
      if (industry !== "all" && job.industry !== industry) continue;
      if (loc !== "" && !locationKeys[i].includes(loc)) continue;
      if (terms.length > 0 && !terms.every((t) => searchKeys[i].includes(t))) continue;
      out.push(job);
    }
    return out;
  }, [
    jobs,
    searchKeys,
    locationKeys,
    levelSet,
    fnSet,
    setup,
    metro,
    industry,
    deferredLocation,
    deferredQuery,
  ]);

  const isFeatured = sameSet(levels, DEFAULT_LEVELS);
  const isDefaultView = filtersToSearch(filters) === "";
  const advancedCount =
    (fns.length > 0 ? 1 : 0) +
    (setup !== "all" ? 1 : 0) +
    (metro !== "all" ? 1 : 0) +
    (industry !== "all" ? 1 : 0) +
    (filters.location !== "" ? 1 : 0);

  function reset() {
    setFilters(defaultFilters());
    setVisible(PAGE_SIZE);
  }

  const shown = filtered.slice(0, visible);
  const updatedMs = Date.parse(updatedAt);

  const fieldClass =
    "h-11 rounded-lg border border-line bg-white px-3 text-sm text-ink placeholder:text-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20";

  const chipClass = (active: boolean) =>
    `shrink-0 rounded-full border px-3.5 py-2 text-sm font-medium transition-colors ${
      active
        ? "border-ink bg-ink text-paper"
        : "border-line bg-white text-ink hover:border-faint"
    }`;

  return (
    <div className="pb-12">
      {/* Sticky filter rail — stays put while the results scroll (SPEC §12 v2) */}
      <div className="sticky top-0 z-20 -mx-4 border-b border-line bg-paper/95 px-4 pb-3 backdrop-blur sm:mx-0 sm:px-0">
        {/* Search + advanced-filters toggle */}
        <div className="flex gap-2 pt-4">
          <div className="relative min-w-0 flex-1">
            <svg
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-faint"
            >
              <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
              <path
                d="m11 11 3.5 3.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            <input
              type="search"
              value={filters.query}
              onChange={(e) => patch({ query: e.target.value })}
              placeholder="Search roles or companies…"
              aria-label="Search roles or companies"
              className={`${fieldClass} w-full pl-10`}
            />
          </div>
          <button
            type="button"
            aria-expanded={panelOpen}
            aria-controls="advanced-filters"
            onClick={() => setPanelOpen((open) => !open)}
            className={`flex h-11 shrink-0 items-center gap-1.5 rounded-lg border px-3.5 text-sm font-medium transition-colors ${
              panelOpen || advancedCount > 0
                ? "border-ink bg-white text-ink"
                : "border-line bg-white text-ink hover:border-faint"
            }`}
          >
            Filters
            {advancedCount > 0 && (
              <span className="rounded-full bg-sun px-1.5 py-px text-[11px] font-bold text-ink">
                {advancedCount}
              </span>
            )}
            <svg
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden
              className={`h-3.5 w-3.5 text-faint transition-transform ${panelOpen ? "rotate-180" : ""}`}
            >
              <path
                d="M4 6l4 4 4-4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        {/* Level chips — multi-select; the featured preset is the default view */}
        <div
          role="group"
          aria-label="Filter by level (multi-select)"
          className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0"
        >
          <button
            type="button"
            aria-pressed={isFeatured}
            onClick={() => patch({ levels: [...DEFAULT_LEVELS] })}
            className={chipClass(isFeatured)}
          >
            <span aria-hidden className={`mr-1 ${isFeatured ? "text-sun" : "text-faint"}`}>
              ✶
            </span>
            Interns &amp; fresh grads
          </button>
          <button
            type="button"
            aria-pressed={levels.length === 0}
            onClick={() => patch({ levels: [] })}
            className={chipClass(levels.length === 0)}
          >
            All roles
          </button>
          {LEVEL_CHIPS.map((chip) => {
            const active = levelSet.has(chip.id);
            return (
              <button
                key={chip.id}
                type="button"
                aria-pressed={active}
                onClick={() => patch({ levels: toggle(levels, chip.id) })}
                className={chipClass(active)}
              >
                {chip.label}
              </button>
            );
          })}
        </div>

        {/* Advanced filters — function multi-select, setup, metro, industry, location.
            On phones it overlays the list (absolute) so the sticky rail stays short;
            on sm+ it sits in-flow inside the rail. */}
        {panelOpen && (
          <div
            id="advanced-filters"
            className="absolute inset-x-0 top-full max-h-[60vh] overflow-y-auto border-b border-line bg-paper px-4 pb-4 pt-3 shadow-[0_12px_24px_-16px_rgba(33,29,22,0.4)] sm:static sm:mt-3 sm:max-h-none sm:overflow-visible sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none"
          >
            <p className="text-xs font-medium uppercase tracking-wider text-faint">
              Function
            </p>
            <div
              role="group"
              aria-label="Filter by function (multi-select)"
              className="mt-1.5 flex flex-wrap gap-1.5"
            >
              {SELECTABLE_FUNCTIONS.map((fn) => {
                const active = fnSet.has(fn);
                return (
                  <button
                    key={fn}
                    type="button"
                    aria-pressed={active}
                    onClick={() => patch({ fns: toggle(fns, fn) })}
                    className={`rounded-full border px-2.5 py-1 text-[13px] font-medium transition-colors ${
                      active
                        ? "border-accent bg-accent text-white"
                        : "border-line bg-white text-ink hover:border-faint"
                    }`}
                  >
                    {FUNCTION_LABELS[fn]}
                  </button>
                );
              })}
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <select
                value={setup}
                onChange={(e) => patch({ setup: e.target.value as Filters["setup"] })}
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
              <select
                value={metro}
                onChange={(e) => patch({ metro: e.target.value as Filters["metro"] })}
                aria-label="Filter by metro area"
                className={`select ${fieldClass} pr-8`}
              >
                <option value="all">Any metro</option>
                {METRO_OPTIONS.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
              <select
                value={industry}
                onChange={(e) => patch({ industry: e.target.value })}
                aria-label="Filter by company industry"
                className={`select ${fieldClass} pr-8`}
              >
                <option value="all">Any industry</option>
                {industries.map((tag) => (
                  <option key={tag} value={tag}>
                    {industryLabel(tag)}
                  </option>
                ))}
              </select>
              {EMPLOYER_TYPE_FILTER_ENABLED && (
                <select
                  aria-label="Filter by employer type"
                  className={`select ${fieldClass} pr-8`}
                >
                  <option value="all">Any employer</option>
                  <option value="direct">Direct employers</option>
                  <option value="agency">Agencies</option>
                </select>
              )}
              <input
                type="text"
                value={filters.location}
                onChange={(e) => patch({ location: e.target.value })}
                placeholder="Location, e.g. Cebu"
                aria-label="Filter by location"
                className={`${fieldClass} col-span-2 sm:col-span-1`}
              />
            </div>
          </div>
        )}
      </div>

      {/* Result count */}
      <div className="mt-4 flex items-baseline justify-between gap-3">
        <p aria-live="polite" className="text-sm text-faint">
          <span className="font-semibold text-ink">
            {filtered.length.toLocaleString("en-US")}
          </span>{" "}
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
                patch({ levels: [] });
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
                    {job.salary && <span className="font-medium text-ink">{job.salary}</span>}
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
