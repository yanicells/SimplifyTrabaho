import type { MetadataRoute } from "next";
import { loadJobs } from "@/lib/listings";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-static";

// One-page site: the canonical URL is the featured view. Filtered views are
// query-param variants of the same document (canonical points here), so they
// don't get sitemap entries.
export default function sitemap(): MetadataRoute.Sitemap {
  const { updatedAt } = loadJobs();
  return [
    {
      // Bare SITE_URL, no trailing slash — that is the exact string Next emits
      // for the canonical link and og:url. A sitemap URL that differs from the
      // canonical by so much as a slash is a needless "alternate page with
      // proper canonical tag" report in Search Console, so all four (canonical,
      // og:url, sitemap, JSON-LD) are held to one spelling.
      url: SITE_URL,
      lastModified: updatedAt,
      changeFrequency: "daily",
      priority: 1,
    },
  ];
}
