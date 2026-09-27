import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { preload } from "react-dom";
import { JobBoard } from "@/components/job-board";
import { BrowseLinks, Breadcrumb, Faq } from "@/components/seo-sections";
import { SiteShell } from "@/components/site-shell";
import { PAGE_SIZE, filterJobs } from "@/lib/filter-jobs";
import {
  fillTemplate,
  landingFilters,
  landingStats,
  publishedLandings,
  type Landing,
} from "@/lib/landings";
import { loadJobs } from "@/lib/listings";
import { OG_IMAGE } from "@/lib/site";
import { buildLandingGraph } from "@/lib/structured-data";
import { DATE_FORMAT } from "@/lib/time";

// Keyword landing pages (see lib/landings.ts). Only pages with enough live
// openings are generated; any other slug is a 404.
export const dynamicParams = false;

export function generateStaticParams() {
  return publishedLandings(loadJobs().jobs).map((l) => ({ slug: l.slug }));
}

type Props = { params: Promise<{ slug: string }> };

/** The landing, its live stats, and its copy with placeholders filled. */
function resolve(slug: string) {
  const { updatedAt, jobs } = loadJobs();
  const landings = publishedLandings(jobs);
  const landing = landings.find((l) => l.slug === slug);
  if (!landing) notFound();
  const stats = landingStats(landing, jobs);
  const fill = (text: string) => fillTemplate(text, stats, updatedAt);
  return { updatedAt, jobs, landings, landing, stats, fill };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { landing, fill } = resolve((await params).slug);
  const title = fill(landing.title);
  const description = fill(landing.description);
  const path = `/${landing.slug}`;
  return {
    title,
    description,
    alternates: {
      canonical: path,
      languages: { "en-PH": path, "x-default": path },
    },
    // Metadata merges shallowly, so the nested objects restate the root's fields.
    openGraph: {
      title,
      description,
      url: path,
      siteName: "SimplifyTrabaho",
      locale: "en_PH",
      type: "website",
      images: [OG_IMAGE],
    },
    twitter: { card: "summary_large_image", title, description, images: [OG_IMAGE.url] },
  };
}

function filledFaq(landing: Landing, fill: (text: string) => string) {
  return landing.faq.map((item) => ({ q: fill(item.q), a: fill(item.a) }));
}

export default async function LandingPage({ params }: Props) {
  const { updatedAt, jobs, landings, landing, stats, fill } = resolve((await params).slug);
  preload("/jobs.json", { as: "fetch", crossOrigin: "anonymous" });

  const filters = landingFilters(landing);
  const faq = filledFaq(landing, fill);
  const graph = buildLandingGraph({
    slug: landing.slug,
    label: landing.label,
    title: fill(landing.title),
    description: fill(landing.description),
    updatedAt,
    faq,
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
      />
      <SiteShell
        title={landing.h1}
        intro={fill(landing.intro)}
        breadcrumb={<Breadcrumb label={landing.label} />}
        after={
          <>
            <BrowseLinks landings={landings} current={landing.slug} />
            <Faq items={faq} />
          </>
        }
      >
        <JobBoard
          initialJobs={stats.jobs.slice(0, PAGE_SIZE)}
          defaultCounts={{
            roles: stats.count,
            companies: stats.companies,
            fields: filterJobs(jobs, [], filters).fieldCounts,
          }}
          updatedAt={updatedAt}
          updatedLabel={DATE_FORMAT.format(new Date(updatedAt))}
          preset={filters}
        />
      </SiteShell>
    </>
  );
}
