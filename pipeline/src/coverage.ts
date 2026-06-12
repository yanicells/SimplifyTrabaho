import { categorize } from "./categorize.js";
import type { Listing } from "./types.js";

// Categorizer coverage report (SPEC §9): the mining loop's instrument. Coverage is
// measured by re-running the CURRENT tables over active titles — it evaluates the
// code as written, independent of what's stored on disk.

export interface TitleCount {
  title: string;
  count: number;
}

export interface CoverageReport {
  active: number;
  levelKnown: number;
  levelUnknown: number;
  functionKnown: number;
  functionOther: number;
  topLevelUnknown: TitleCount[];
  topFunctionOther: TitleCount[];
}

const DEFAULT_TOP_N = 50;

function topCounts(titles: string[], topN: number): TitleCount[] {
  const counts = new Map<string, number>();
  for (const title of titles) {
    const key = title.trim();
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([title, count]) => ({ title, count }))
    .sort((a, b) => b.count - a.count || a.title.localeCompare(b.title))
    .slice(0, topN);
}

export function computeCoverage(
  listings: Listing[],
  { topN = DEFAULT_TOP_N }: { topN?: number } = {},
): CoverageReport {
  const active = listings.filter((l) => l.active);
  const levelUnknownTitles: string[] = [];
  const functionOtherTitles: string[] = [];
  for (const listing of active) {
    const { level, function: fn } = categorize(listing.title);
    if (level === "unknown") levelUnknownTitles.push(listing.title);
    if (fn === "other") functionOtherTitles.push(listing.title);
  }
  return {
    active: active.length,
    levelKnown: active.length - levelUnknownTitles.length,
    levelUnknown: levelUnknownTitles.length,
    functionKnown: active.length - functionOtherTitles.length,
    functionOther: functionOtherTitles.length,
    topLevelUnknown: topCounts(levelUnknownTitles, topN),
    topFunctionOther: topCounts(functionOtherTitles, topN),
  };
}

function pct(part: number, total: number): string {
  return total === 0 ? "0.0%" : `${((100 * part) / total).toFixed(1)}%`;
}

export function formatCoverageReport(report: CoverageReport): string {
  const lines = [
    `categorizer coverage (active listings, current tables):`,
    `  level known: ${report.levelKnown}/${report.active} (${pct(report.levelKnown, report.active)}) · unknown ${report.levelUnknown} (${pct(report.levelUnknown, report.active)})`,
    `  function known: ${report.functionKnown}/${report.active} (${pct(report.functionKnown, report.active)}) · other ${report.functionOther} (${pct(report.functionOther, report.active)})`,
  ];
  if (report.topLevelUnknown.length > 0) {
    lines.push(`  top level-unknown titles:`);
    for (const { title, count } of report.topLevelUnknown) {
      lines.push(`    ${String(count).padStart(3)} × ${title}`);
    }
  }
  if (report.topFunctionOther.length > 0) {
    lines.push(`  top function-other titles:`);
    for (const { title, count } of report.topFunctionOther) {
      lines.push(`    ${String(count).padStart(3)} × ${title}`);
    }
  }
  return lines.join("\n");
}
