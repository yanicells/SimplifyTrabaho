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
      // Trailing slash, matching what the canonical link resolves to. A sitemap
      // URL that differs from the canonical by so much as a slash is a
      // needless "alternate page with proper canonical tag" report in Search
      // Console.
      url: `${SITE_URL}/`,
      lastModified: updatedAt,
      changeFrequency: "daily",
      priority: 1,
    },
  ];
}
