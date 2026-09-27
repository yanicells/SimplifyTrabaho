import type { MetadataRoute } from "next";
import { publishedLandings } from "@/lib/landings";
import { loadJobs } from "@/lib/listings";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-static";

// The home page plus every published keyword landing page. Filtered views are
// query-param variants of those documents (their canonical points back), so
// they don't get sitemap entries.
export default function sitemap(): MetadataRoute.Sitemap {
  const { updatedAt, jobs } = loadJobs();
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
    ...publishedLandings(jobs).map((l) => ({
      url: `${SITE_URL}/${l.slug}`,
      lastModified: updatedAt,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
  ];
}
