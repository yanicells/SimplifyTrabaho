// Application tracker — pure data layer (SPEC §18 Phase 11). All state lives in
// localStorage; no accounts, no backend. Tracked jobs keep a snapshot of
// company/title so the tracker still renders after a listing goes inactive and
// drops out of the day's data.

export const TRACKER_STATUSES = [
  "saved",
  "applied",
  "interview",
  "offer",
  "waitlisted",
  "rejected",
] as const;

export type TrackerStatus = (typeof TRACKER_STATUSES)[number];

export const TRACKER_STATUS_LABELS: Record<TrackerStatus, string> = {
  saved: "Saved",
  applied: "Applied",
  interview: "Interview",
  offer: "Offer",
  waitlisted: "Waitlisted",
  rejected: "Rejected",
};

export interface TrackedJob {
  /** The listing's official application URL — the stable identity everywhere. */
  url: string;
  company: string;
  title: string;
  status: TrackerStatus;
  /** ISO timestamp when the job was first saved. */
  savedAt: string;
  /** ISO timestamp of the last status change. */
  updatedAt: string;
}

export interface TrackerState {
  version: 1;
  jobs: TrackedJob[];
}

export function emptyTracker(): TrackerState {
  return { version: 1, jobs: [] };
}

/**
 * Lenient parse of a stored tracker blob: junk entries are dropped, never
 * thrown on — a corrupted store must not take the board down.
 */
export function parseTracker(raw: string | null): TrackerState {
  if (raw === null) return emptyTracker();
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return emptyTracker();
  }
  const obj = data as { version?: unknown; jobs?: unknown };
  if (obj?.version !== 1 || !Array.isArray(obj.jobs)) return emptyTracker();
  const seen = new Set<string>();
  const jobs: TrackedJob[] = [];
  for (const item of obj.jobs) {
    const j = item as Record<string, unknown>;
    if (
      typeof j?.url !== "string" ||
      j.url === "" ||
      typeof j.company !== "string" ||
      typeof j.title !== "string" ||
      typeof j.savedAt !== "string" ||
      typeof j.updatedAt !== "string" ||
      !(TRACKER_STATUSES as readonly string[]).includes(j.status as string) ||
      seen.has(j.url)
    ) {
      continue;
    }
    seen.add(j.url);
    jobs.push({
      url: j.url,
      company: j.company,
      title: j.title,
      status: j.status as TrackerStatus,
      savedAt: j.savedAt,
      updatedAt: j.updatedAt,
    });
  }
  return { version: 1, jobs };
}

export function serializeTracker(state: TrackerState): string {
  return JSON.stringify(state);
}

export function isTracked(state: TrackerState, url: string): boolean {
  return state.jobs.some((j) => j.url === url);
}

/** Save a job (status "saved"). No-op if the URL is already tracked. */
export function trackJob(
  state: TrackerState,
  job: { url: string; company: string; title: string },
  now: string,
): TrackerState {
  if (isTracked(state, job.url)) return state;
  return {
    version: 1,
    jobs: [...state.jobs, { ...job, status: "saved", savedAt: now, updatedAt: now }],
  };
}

export function untrackJob(state: TrackerState, url: string): TrackerState {
  return { version: 1, jobs: state.jobs.filter((j) => j.url !== url) };
}

export function setJobStatus(
  state: TrackerState,
  url: string,
  status: TrackerStatus,
  now: string,
): TrackerState {
  return {
    version: 1,
    jobs: state.jobs.map((j) =>
      j.url === url && j.status !== status ? { ...j, status, updatedAt: now } : j,
    ),
  };
}

/** Pretty JSON for the export download — the user's data, in the clear. */
export function exportTracker(state: TrackerState): string {
  return JSON.stringify(state, null, 2) + "\n";
}
