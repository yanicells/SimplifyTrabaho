import { describe, expect, it } from "vitest";
import { interleaveByCompany } from "../src/feed.js";

interface Row {
  company: string;
  day: string;
  n: number;
}

function row(company: string, day: string, n: number): Row {
  return { company, day, n };
}

function interleave(rows: Row[]): Row[] {
  return interleaveByCompany(
    rows,
    (r) => r.day,
    (r) => r.company,
  );
}

describe("interleaveByCompany", () => {
  it("returns empty input unchanged", () => {
    expect(interleave([])).toEqual([]);
  });

  it("round-robins companies within a day bucket", () => {
    const rows = [
      row("Accenture", "2026-07-06", 1),
      row("Accenture", "2026-07-06", 2),
      row("Accenture", "2026-07-06", 3),
      row("Beta", "2026-07-06", 4),
      row("Cebu Co", "2026-07-06", 5),
    ];
    expect(interleave(rows).map((r) => r.company)).toEqual([
      "Accenture",
      "Beta",
      "Cebu Co",
      "Accenture",
      "Accenture",
    ]);
  });

  it("preserves each company's internal order", () => {
    const rows = [
      row("A", "2026-07-06", 1),
      row("A", "2026-07-06", 2),
      row("B", "2026-07-06", 3),
      row("B", "2026-07-06", 4),
    ];
    expect(interleave(rows).map((r) => r.n)).toEqual([1, 3, 2, 4]);
  });

  it("never mixes items across day buckets", () => {
    const rows = [
      row("A", "2026-07-07", 1),
      row("A", "2026-07-07", 2),
      row("B", "2026-07-06", 3),
      row("A", "2026-07-06", 4),
    ];
    const result = interleave(rows);
    expect(result.map((r) => r.day)).toEqual([
      "2026-07-07",
      "2026-07-07",
      "2026-07-06",
      "2026-07-06",
    ]);
    // Within 07-06, B leads because it appeared first in the incoming order.
    expect(result.slice(2).map((r) => r.company)).toEqual(["B", "A"]);
  });

  it("is a permutation of its input", () => {
    const rows = [
      row("A", "2026-07-06", 1),
      row("B", "2026-07-06", 2),
      row("A", "2026-07-05", 3),
      row("C", "2026-07-05", 4),
      row("C", "2026-07-05", 5),
    ];
    const result = interleave(rows);
    expect(result).toHaveLength(rows.length);
    expect(new Set(result.map((r) => r.n)).size).toBe(rows.length);
  });
});
