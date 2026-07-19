// Feed ordering shared by the web board and the README featured table.
//
// A plain datePosted-desc sort clusters bulk posters: on first-seen days a
// single company (e.g. Accenture) can occupy hundreds of consecutive rows,
// which reads like a single-company board. Interleaving round-robins across
// companies inside each posted-day bucket, so day-level recency is preserved
// while no company monopolizes a stretch of the feed.

/**
 * Round-robin items across companies within each same-day bucket.
 *
 * Input must already be sorted newest-day first (ties broken however the
 * caller likes — that order decides each company's rotation slot and the
 * per-company order, so the result is fully deterministic).
 */
export function interleaveByCompany<T>(
  items: readonly T[],
  day: (item: T) => string,
  company: (item: T) => string,
): T[] {
  const out: T[] = [];
  let bucketDay: string | null = null;
  let queues = new Map<string, T[]>();

  const flushBucket = () => {
    let round = [...queues.values()];
    while (round.length > 0) {
      const survivors: T[][] = [];
      for (const queue of round) {
        const item = queue.shift();
        if (item !== undefined) out.push(item);
        if (queue.length > 0) survivors.push(queue);
      }
      round = survivors;
    }
    queues = new Map();
  };

  for (const item of items) {
    const itemDay = day(item);
    if (itemDay !== bucketDay) {
      flushBucket();
      bucketDay = itemDay;
    }
    const queue = queues.get(company(item));
    if (queue) queue.push(item);
    else queues.set(company(item), [item]);
  }
  flushBucket();
  return out;
}
