import { describe, expect, it } from "vitest";
import robots from "../app/robots";
import vercelConfig from "../vercel.json";

describe("generated text payload indexing", () => {
  it("lets crawlers fetch text files so they can receive noindex", () => {
    const config = robots();
    const rules = Array.isArray(config.rules) ? config.rules : [config.rules];

    for (const rule of rules) {
      expect(rule.disallow).toBeUndefined();
    }
  });

  it("marks every exported text file noindex at the hosting layer", () => {
    const textRule = vercelConfig.headers.find((rule) => rule.source === "/:path*.txt");

    expect(textRule?.headers).toContainEqual({
      key: "X-Robots-Tag",
      value: "noindex",
    });
  });
});

describe("generated metadata image responses", () => {
  it.each(["/opengraph-image", "/icon", "/apple-icon"])("serves %s as image/png", (source) => {
    const imageRule = vercelConfig.headers.find((rule) => rule.source === source);

    expect(imageRule?.headers).toContainEqual({
      key: "Content-Type",
      value: "image/png",
    });
  });
});
