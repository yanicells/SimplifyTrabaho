import { preload } from "react-dom";
import { JobBoard } from "@/components/job-board";
import { SiteShell } from "@/components/site-shell";
import { defaultFilters } from "@/lib/filter-params";
import { filterJobs, PAGE_SIZE } from "@/lib/filter-jobs";
import { loadJobs } from "@/lib/listings";
import { SITE_DESCRIPTION, SITE_TITLE } from "@/lib/site";
import { buildGraph } from "@/lib/structured-data";
import { DATE_FORMAT } from "@/lib/time";

export default function Home() {
  const { updatedAt, jobs } = loadJobs();
  const companyCount = new Set(jobs.map((j) => j.company)).size;
  // Only the first page of rows ships in the HTML; the full list is a static file
  // the board fetches after hydration. Preloading starts that download alongside
  // the page's JS instead of after it.
  preload("/jobs.json", { as: "fetch", crossOrigin: "anonymous" });

  const graph = buildGraph({
    updatedAt,
    jobCount: jobs.length,
    companyCount,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
      />
      <SiteShell
        title="Search job openings in the Philippines."
        intro="Jobs and internships from official company career feeds — checked daily."
      >
        <JobBoard
          initialJobs={jobs.slice(0, PAGE_SIZE)}
          defaultCounts={{
            roles: jobs.length,
            companies: companyCount,
            fields: filterJobs(jobs, [], defaultFilters()).fieldCounts,
          }}
          updatedAt={updatedAt}
          updatedLabel={DATE_FORMAT.format(new Date(updatedAt))}
        />
      </SiteShell>
    </>
  );
}
