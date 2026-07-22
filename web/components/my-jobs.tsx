"use client";

import {
  TRACKER_STATUSES,
  TRACKER_STATUS_LABELS,
  exportTracker,
  type TrackerState,
  type TrackerStatus,
} from "@/lib/tracker";
import { timeAgo } from "@/lib/time";
import { FilterSelect } from "@/components/filter-select";

/**
 * "My jobs" — the application-tracker view (Phase 11). Everything renders from
 * localStorage snapshots so saved jobs survive listings going inactive.
 */
export function MyJobs({
  tracker,
  liveUrls,
  updatedAt,
  onStatus,
  onRemove,
}: {
  tracker: TrackerState;
  /** URLs still present in today's data — anything else gets a "no longer listed" tag. */
  liveUrls: Set<string>;
  updatedAt: string;
  onStatus: (url: string, status: TrackerStatus) => void;
  onRemove: (url: string) => void;
}) {
  function download() {
    const blob = new Blob([exportTracker(tracker)], { type: "application/json" });
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href;
    a.download = "simplifytrabaho-applications.json";
    a.click();
    URL.revokeObjectURL(href);
  }

  if (tracker.jobs.length === 0) {
    return (
      <div>
        {/* Caption then hairline then content — the shape every view uses. */}
        <div className="border-b border-line pb-3">
          <p className="text-sm text-faint">
            <span className="font-semibold tabular-nums text-ink">0</span> jobs tracked · saved
            on this device only
          </p>
        </div>
        <div className="py-16 text-center">
          <p className="font-display text-lg font-bold">No saved jobs yet</p>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-faint">
            Tap the bookmark on any role to save it here, then track your progress
            from applied to offer. Everything stays on this device.
          </p>
        </div>
      </div>
    );
  }

  // Most recently touched first — the active applications float to the top.
  const jobs = [...tracker.jobs].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  return (
    <div>
      {/* Same caption shape as the board: count left, actions right, one hairline. */}
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-line pb-3">
        <p className="text-sm text-faint">
          <span className="font-semibold tabular-nums text-ink">{jobs.length}</span>{" "}
          {jobs.length === 1 ? "job" : "jobs"} tracked · saved on this device only
        </p>
        <button
          type="button"
          onClick={download}
          className="shrink-0 text-sm font-medium text-ink underline underline-offset-2 hover:text-faint focus:outline-none focus-visible:ring-2 focus-visible:ring-ink"
        >
          Export JSON
        </button>
      </div>

      <ul role="list" className="divide-y divide-line">
        {jobs.map((job) => {
          const gone = !liveUrls.has(job.url);
          return (
            <li key={job.url} className="flex flex-wrap items-center gap-x-4 gap-y-3 py-4">
              <div className="min-w-0 flex-1 basis-64">
                <p className="flex flex-wrap items-baseline gap-x-2 text-[13px] text-faint">
                  <span className="font-semibold uppercase tracking-wide text-ink/80">
                    {job.company}
                  </span>
                  <span>saved {timeAgo(job.savedAt, updatedAt)}</span>
                  {gone && (
                    <span className="rounded-full bg-soft px-1.5 py-px text-[11px] font-semibold text-faint">
                      No longer listed
                    </span>
                  )}
                </p>
                <h3 className="mt-1 text-[16px] font-semibold leading-snug">
                  <a
                    href={job.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                  >
                    {job.title}
                  </a>
                </h3>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <FilterSelect
                  label={`Status for ${job.title} at ${job.company}`}
                  value={job.status}
                  dense
                  menuAlign="right"
                  onChange={(v) => onStatus(job.url, v as TrackerStatus)}
                  options={TRACKER_STATUSES.map((s) => ({
                    value: s,
                    label: TRACKER_STATUS_LABELS[s],
                  }))}
                />
                <button
                  type="button"
                  onClick={() => onRemove(job.url)}
                  aria-label={`Remove ${job.title} at ${job.company} from saved jobs`}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-soft text-faint transition-colors hover:bg-press hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-ink"
                >
                  <svg viewBox="0 0 16 16" fill="none" aria-hidden className="h-4 w-4">
                    <path
                      d="M4 4l8 8M12 4l-8 8"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
