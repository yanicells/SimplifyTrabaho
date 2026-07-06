import { describe, expect, it } from "vitest";
import {
  emptyTracker,
  exportTracker,
  isTracked,
  parseTracker,
  serializeTracker,
  setJobStatus,
  trackJob,
  untrackJob,
  type TrackerState,
} from "./tracker";

const NOW = "2026-07-06T04:00:00.000Z";
const LATER = "2026-07-07T04:00:00.000Z";

const JOB = {
  url: "https://boards.greenhouse.io/xendit/jobs/123",
  company: "Xendit",
  title: "Software Engineering Intern",
};

function tracked(): TrackerState {
  return trackJob(emptyTracker(), JOB, NOW);
}

describe("trackJob", () => {
  it("saves a job with status saved and both timestamps", () => {
    const state = tracked();
    expect(state.jobs).toEqual([
      { ...JOB, status: "saved", savedAt: NOW, updatedAt: NOW },
    ]);
    expect(isTracked(state, JOB.url)).toBe(true);
  });

  it("is a no-op for an already-tracked URL (keeps the original status)", () => {
    const state = setJobStatus(tracked(), JOB.url, "applied", LATER);
    const again = trackJob(state, JOB, LATER);
    expect(again.jobs).toHaveLength(1);
    expect(again.jobs[0].status).toBe("applied");
  });
});

describe("setJobStatus", () => {
  it("updates status and bumps updatedAt, savedAt untouched", () => {
    const state = setJobStatus(tracked(), JOB.url, "interview", LATER);
    expect(state.jobs[0].status).toBe("interview");
    expect(state.jobs[0].updatedAt).toBe(LATER);
    expect(state.jobs[0].savedAt).toBe(NOW);
  });

  it("does not bump updatedAt when the status is unchanged", () => {
    const state = setJobStatus(tracked(), JOB.url, "saved", LATER);
    expect(state.jobs[0].updatedAt).toBe(NOW);
  });
});

describe("untrackJob", () => {
  it("removes only the matching URL", () => {
    const two = trackJob(tracked(), { ...JOB, url: "https://x.co/2" }, NOW);
    const state = untrackJob(two, JOB.url);
    expect(state.jobs.map((j) => j.url)).toEqual(["https://x.co/2"]);
  });
});

describe("parseTracker", () => {
  it("round-trips through serializeTracker", () => {
    const state = setJobStatus(tracked(), JOB.url, "waitlisted", LATER);
    expect(parseTracker(serializeTracker(state))).toEqual(state);
  });

  it("returns an empty tracker for null, junk JSON, and wrong shapes", () => {
    expect(parseTracker(null)).toEqual(emptyTracker());
    expect(parseTracker("not json{")).toEqual(emptyTracker());
    expect(parseTracker('{"version":9,"jobs":[]}')).toEqual(emptyTracker());
    expect(parseTracker('{"version":1,"jobs":"nope"}')).toEqual(emptyTracker());
  });

  it("drops corrupt entries, invalid statuses, and duplicate URLs — keeps the rest", () => {
    const good = tracked().jobs[0];
    const blob = JSON.stringify({
      version: 1,
      jobs: [
        good,
        { ...good, url: "" }, // missing identity
        { ...good, url: "https://x.co/2", status: "ghosted" }, // invalid status
        { ...good }, // duplicate URL
        "garbage",
        { ...good, url: "https://x.co/3", status: "rejected" },
      ],
    });
    const state = parseTracker(blob);
    expect(state.jobs.map((j) => j.url)).toEqual([good.url, "https://x.co/3"]);
    expect(state.jobs[1].status).toBe("rejected");
  });
});

describe("exportTracker", () => {
  it("emits pretty JSON with a trailing newline", () => {
    const out = exportTracker(tracked());
    expect(out.endsWith("\n")).toBe(true);
    expect(JSON.parse(out).jobs).toHaveLength(1);
  });
});
