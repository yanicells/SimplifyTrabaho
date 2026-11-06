import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import rule from "../firewall/jobs-json-rate-limit.json";

// The WAF rule lives outside the build, so nothing else notices if the feed moves
// and the limit silently stops matching it.
describe("jobs.json rate-limit rule", () => {
  it("matches only the path the homepage fetches, and answers excess with 429", () => {
    const board = readFileSync(
      new URL("../components/job-board.tsx", import.meta.url),
      "utf8",
    );
    const conditions = rule.conditionGroup.flatMap((group) => group.conditions);
    const [condition] = conditions;

    expect(conditions).toHaveLength(1);
    expect(condition).toEqual({ type: "path", op: "eq", value: "/jobs.json" });
    expect(board).toContain(`fetch("${condition.value}")`);
    expect(rule.action.mitigate).toEqual({
      action: "rate_limit",
      rateLimit: {
        algo: "fixed_window",
        window: 60,
        limit: 30,
        keys: ["ip"],
        action: "rate_limit",
      },
    });
  });
});
