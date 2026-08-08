import type { MetadataRoute } from "next";
import { SITE_URL } from "../lib/site";

export const dynamic = "force-static";

// Next's static export writes each route's RSC payload beside its HTML as a
// .txt twin — /index.txt, /_not-found.txt, /__next._full.txt and friends. They
// are served publicly as text/plain and carry the same content as the page they
// mirror, so left crawlable they compete with / as duplicate content. Browsers
// ignore robots.txt, so client-side navigation is unaffected.
//
// The prefix "/__next." covers every __next.*.txt payload. It must not be
// written "/_next" — that is the static JS/CSS directory, and blocking it would
// stop Google rendering the page at all.
//
// /llms.txt is deliberately not listed: that one exists to be read.
const RSC_PAYLOADS = ["/index.txt", "/_not-found.txt", "/__next."];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: RSC_PAYLOADS },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
