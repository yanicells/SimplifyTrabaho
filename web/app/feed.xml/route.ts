import { loadJobs } from "@/lib/listings";

export const dynamic = "force-static";

const SITE_URL = "https://simplifytrabaho.ycells.com";
const FEED_SIZE = 100;

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// RSS 2.0 feed of the newest listings (SPEC §18 Phase 12). Facts only, same as
// everywhere else: title, company, location, official application link.
export function GET(): Response {
  const { updatedAt, jobs } = loadJobs();
  const newest = [...jobs]
    .sort((a, b) => b.posted.localeCompare(a.posted))
    .slice(0, FEED_SIZE);

  const items = newest
    .map((job) => {
      const location = job.locations.length > 0 ? ` · ${job.locations[0]}` : "";
      return `    <item>
      <title>${escapeXml(`${job.title} — ${job.company}`)}</title>
      <link>${escapeXml(job.url)}</link>
      <guid isPermaLink="true">${escapeXml(job.url)}</guid>
      <pubDate>${new Date(`${job.posted}T00:00:00Z`).toUTCString()}</pubDate>
      <description>${escapeXml(
        `${job.company}${location} · via SimplifyTrabaho. Apply on the official page.`,
      )}</description>
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>SimplifyTrabaho — new jobs at Philippine companies</title>
    <link>${SITE_URL}</link>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml"/>
    <description>Newest openings at Philippine companies, pulled daily from official careers feeds. Free and open.</description>
    <language>en-ph</language>
    <lastBuildDate>${new Date(updatedAt).toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>
`;

  return new Response(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
