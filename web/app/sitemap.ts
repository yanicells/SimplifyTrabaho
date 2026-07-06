import type { MetadataRoute } from "next";
import { loadJobs } from "@/lib/listings";

export const dynamic = "force-static";

// One-page site: the canonical URL is the featured view. Filtered views are
// query-param variants of the same document (canonical points here), so they
// don't get sitemap entries.
export default function sitemap(): MetadataRoute.Sitemap {
  const { updatedAt } = loadJobs();
  return [
    {
      url: "https://simplifytrabaho.ycells.com",
      lastModified: updatedAt,
      changeFrequency: "daily",
      priority: 1,
    },
  ];
}
