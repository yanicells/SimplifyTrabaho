// Feed ordering shared by the web board and the README featured table.
//
// A plain datePosted-desc sort clusters bulk posters: on a busy day one company
// (e.g. Accenture, 100+ roles) can occupy hundreds of consecutive rows, which
// reads like a single-company board. Round-robin within a day isn't enough when
// few other companies posted that day, so each company also gets at most
// `perSlot` rows per day slot; its extra roles slide into later slots, where they
// mix with the next days' postings.

/**
 * Newest-first order where no company monopolizes a stretch of the feed.
 *
 * Input must already be sorted newest-day first (ties broken however the caller
 * likes — that order decides each company's rotation and per-company order, so
 * the result is fully deterministic). Slots are the distinct days in input
 * order; a company's roles fill its slots `perSlot` at a time, and each slot is
 * round-robined across companies.
 */
export function interleaveByCompany<T>(
  items: readonly T[],
  day: (item: T) => string,
  company: (item: T) => string,
  perSlot = 3,
): T[] {
  const dayRank = new Map<string, number>();
  const cursor = new Map<string, { slot: number; used: number }>();
  const slots: Map<string, T[]>[] = [];

  for (const item of items) {
    const d = day(item);
    if (!dayRank.has(d)) dayRank.set(d, dayRank.size);
    const rank = dayRank.get(d) as number;
    const c = company(item);
    let at = cursor.get(c);
    if (at === undefined || at.slot < rank) at = { slot: rank, used: 0 };
    if (at.used === perSlot) at = { slot: at.slot + 1, used: 0 };
    at.used += 1;
    cursor.set(c, at);

    const slot = (slots[at.slot] ??= new Map());
    const queue = slot.get(c);
    if (queue) queue.push(item);
    else slot.set(c, [item]);
  }

  const out: T[] = [];
  for (const slot of slots) {
    if (slot === undefined) continue;
    let round = [...slot.values()];
    while (round.length > 0) {
      const survivors: T[][] = [];
      for (const queue of round) {
        out.push(queue.shift() as T);
        if (queue.length > 0) survivors.push(queue);
      }
      round = survivors;
    }
  }
  return out;
}
