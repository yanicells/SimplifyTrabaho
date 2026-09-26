import { existsSync, readFileSync, writeFileSync } from "node:fs";

// data/fetch-state.json: what `pnpm refresh` must remember between runs.

export interface FetchState {
  version: 1;
  /** consecutive dead-slug counts keyed by "ats:slug" */
  deadSlugStreaks: Record<string, number>;
  /**
   * Workday §17.1.2 permanent stops keyed by "ats:slug" → "date: reason".
   * A blocked tenant is skipped on every future run until a human deletes the
   * entry here (after reviewing why it was blocked). Never auto-cleared.
   */
  blocked?: Record<string, string>;
}

export function loadFetchState(path: string): FetchState {
  if (!existsSync(path)) return { version: 1, deadSlugStreaks: {}, blocked: {} };
  const state = JSON.parse(readFileSync(path, "utf8")) as FetchState;
  state.blocked ??= {};
  return state;
}

export function saveFetchState(path: string, state: FetchState): void {
  writeFileSync(path, JSON.stringify(state, null, 2) + "\n");
}

/**
 * Records a permanent block and writes the file at once, not at the end of the
 * run: a run that then crashes, times out, or fails every fetch must not lose
 * the block, or the next run would request the blocked tenant again.
 */
export function recordBlock(path: string, state: FetchState, key: string, note: string): void {
  state.blocked ??= {};
  state.blocked[key] = note;
  saveFetchState(path, state);
}
