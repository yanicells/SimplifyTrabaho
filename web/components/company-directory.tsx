"use client";

import { useMemo } from "react";
import type { Job } from "@/lib/listings";
import { industryLabel } from "@/components/job-board";

export type CompanySort = "roles" | "name";

interface CompanyRow {
  name: string;
  count: number;
  industry: string;
  type: Job["companyType"];
}

/**
 * Browsable list of every company with open roles — tap a company to see its
 * listings on the board. Search and sort live in the board's own rail, so this
 * component owns no controls of its own. Rows are hairline-divided (no card
 * chrome) per the DESIGN.md faq-row pattern.
 */
export function CompanyDirectory({
  jobs,
  query,
  sort,
  onClearQuery,
  onSelect,
}: {
  jobs: Job[];
  /** The shared rail search box, reused verbatim as the company filter. */
  query: string;
  sort: CompanySort;
  onClearQuery: () => void;
  onSelect: (company: string) => void;
}) {
  const companies = useMemo(() => {
    const byName = new Map<string, CompanyRow>();
    for (const job of jobs) {
      const row = byName.get(job.company);
      if (row) {
        row.count += 1;
      } else {
        byName.set(job.company, {
          name: job.company,
          count: 1,
          industry: job.industry,
          type: job.companyType,
        });
      }
    }
    return [...byName.values()];
  }, [jobs]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matched =
      q === "" ? [...companies] : companies.filter((c) => c.name.toLowerCase().includes(q));
    matched.sort((a, b) =>
      sort === "roles"
        ? b.count - a.count || a.name.localeCompare(b.name)
        : a.name.localeCompare(b.name),
    );
    return matched;
  }, [companies, query, sort]);

  return (
    <div>
      {/* Same caption shape as the board: count left, sort state right. */}
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-line pb-3">
        <p aria-live="polite" className="text-sm text-faint">
          <span className="font-semibold text-ink">{shown.length.toLocaleString("en-US")}</span>{" "}
          {shown.length === 1 ? "company" : "companies"} with open roles
        </p>
        <p className="text-sm text-faint">
          {sort === "roles" ? "Most roles first" : "A–Z"}
        </p>
      </div>

      {shown.length === 0 ? (
        <div className="py-16 text-center">
          <p className="font-display text-lg font-bold">No company matches “{query.trim()}”.</p>
          <p className="mt-2 text-sm text-faint">
            Check the spelling, or{" "}
            <button
              type="button"
              onClick={onClearQuery}
              className="font-medium text-ink underline underline-offset-2 hover:text-faint"
            >
              browse all companies
            </button>
            .
          </p>
        </div>
      ) : (
        <ul role="list" className="divide-y divide-line">
          {shown.map((c) => (
            <li key={c.name}>
              <button
                type="button"
                onClick={() => onSelect(c.name)}
                aria-label={`See ${c.count === 1 ? "1 open role" : `${c.count} open roles`} at ${c.name}`}
                className="group flex w-full items-center gap-3 py-4 text-left"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[16px] font-semibold leading-snug group-hover:underline group-hover:underline-offset-2">
                    {c.name}
                  </p>
                  <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-faint">
                    {c.industry !== "" && (
                      <span className="rounded-full bg-soft px-2 py-0.5 font-medium">
                        {industryLabel(c.industry)}
                      </span>
                    )}
                    <span>{c.type === "direct" ? "Direct employer" : "Agency"}</span>
                  </p>
                </div>
                <span className="shrink-0 text-sm font-semibold text-ink">
                  {c.count.toLocaleString("en-US")}{" "}
                  <span className="font-normal text-faint">{c.count === 1 ? "role" : "roles"}</span>
                </span>
                <svg
                  viewBox="0 0 16 16"
                  fill="none"
                  aria-hidden
                  className="h-4 w-4 shrink-0 text-mute transition-transform group-hover:translate-x-0.5 group-hover:text-ink"
                >
                  <path
                    d="M6 4l4 4-4 4"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
