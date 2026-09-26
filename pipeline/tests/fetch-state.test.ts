import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadFetchState, recordBlock } from "../src/fetch-state.js";

describe("recordBlock (SPEC §17.1.2)", () => {
  it("writes the block to disk at once, so a run that dies later can't lose it", () => {
    const path = join(mkdtempSync(join(tmpdir(), "fetch-state-")), "fetch-state.json");
    const state = loadFetchState(path); // no file yet → empty state
    expect(state.blocked).toEqual({});

    recordBlock(path, state, "workday:acme.wd1/External", "2026-09-27: HTTP 403");

    // Read straight from disk: nothing else in the run has saved yet.
    expect(JSON.parse(readFileSync(path, "utf8")).blocked).toEqual({
      "workday:acme.wd1/External": "2026-09-27: HTTP 403",
    });
    expect(loadFetchState(path).blocked).toEqual({
      "workday:acme.wd1/External": "2026-09-27: HTTP 403",
    });
  });
});
