import { preload } from "react-dom";
import { JobBoard } from "@/components/job-board";
import { BrowseLinks, Faq } from "@/components/seo-sections";
import { SiteShell } from "@/components/site-shell";
import { defaultFilters } from "@/lib/filter-params";
import { filterJobs, PAGE_SIZE } from "@/lib/filter-jobs";
import { publishedLandings, type FaqItem } from "@/lib/landings";
import { loadJobs } from "@/lib/listings";
import { SITE_DESCRIPTION, SITE_TITLE, SITE_URL } from "@/lib/site";
import { buildGraph, faqNode } from "@/lib/structured-data";
import { DATE_FORMAT } from "@/lib/time";

// Written for the questions people actually type into Google about PH job hunting.
const HOME_FAQ: FaqItem[] = [
  {
    q: "Where can I find internships or OJT in the Philippines?",
    a: "Tap the Internships chip above, or open the Internships page. It lists internship and OJT openings from companies hiring students in the Philippines, each linked to the company's official application page.",
  },
  {
    q: "Where can fresh graduates find entry-level jobs?",
    a: "Pick the Entry level chip to see roles meant for fresh grads and career starters, then narrow by field (IT, accounting, customer service, and more) or by city.",
  },
  {
    q: "Are there work from home jobs in the Philippines here?",
    a: "Yes. Set Work setup to Remote under Filters, or open the Remote jobs page. Only roles the company itself marks as remote are included.",
  },
  {
    q: "Are the job listings legit?",
    a: "Every listing comes straight from the company's own careers feed (Greenhouse, Lever, Workday, and other hiring systems companies publish on purpose). We don't copy from job boards, and Apply always takes you to the employer's official page. Legit employers never ask you to pay to apply.",
  },
  {
    q: "Is SimplifyTrabaho free?",
    a: "Yes, completely. There are no accounts and no fees, and the code and data are open source on GitHub.",
  },
  {
    q: "How often are jobs updated?",
    a: "Once a day. New openings appear within a day of being posted, and closed ones drop off automatically.",
  },
];

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
  }) as { "@graph": object[] };
  graph["@graph"].push(faqNode(SITE_URL, HOME_FAQ));

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
      />
      <SiteShell
        title="Jobs & internships in the Philippines."
        intro={`${jobs.length.toLocaleString("en-US")} openings at ${companyCount.toLocaleString("en-US")} companies, including internships, OJT, fresh grad, and remote jobs. Pulled daily from official company career pages.`}
        after={
          <>
            <BrowseLinks landings={publishedLandings(jobs)} />
            <Faq items={HOME_FAQ} />
          </>
        }
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
