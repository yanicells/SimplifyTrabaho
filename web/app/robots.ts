import type { MetadataRoute } from "next";
import { SITE_URL } from "../lib/site";

export const dynamic = "force-static";

// Exported RSC payloads stay crawlable here so bots can read the
// `X-Robots-Tag: noindex` response header configured for .txt files in
// vercel.json. A robots.txt disallow would hide that directive and can still
// leave the URL indexed without content.

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
