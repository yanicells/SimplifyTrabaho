import { JobBoard } from "@/components/job-board";
import { loadJobs } from "@/lib/listings";
import { REPO_URL } from "@/lib/site";

// UTC-pinned so the build machine's timezone can't shift the stamp.
const DATE_FORMAT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

export default function Home() {
  const { updatedAt, jobs } = loadJobs();
  // Industry options for the filter, built at build time (30-ish short strings).
  const industries = [...new Set(jobs.map((j) => j.industry).filter(Boolean))].sort();

  return (
    <>
      <div className="mx-auto w-full max-w-5xl flex-1 px-4 sm:px-6 lg:px-8">
        <header className="pt-6 pb-2 sm:pt-8">
          <div className="flex items-center justify-between gap-4">
            <p className="font-display text-xl font-bold tracking-tight">
              SimplifyTrabaho
            </p>
            <a
              href={REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-soft px-4 text-sm font-medium text-ink transition-colors hover:bg-press"
            >
              <svg viewBox="0 0 16 16" className="h-4 w-4 fill-current" aria-hidden>
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
              </svg>
              GitHub
            </a>
          </div>

          <h1 className="mt-8 max-w-2xl text-balance font-display text-4xl font-bold leading-[1.1] sm:text-5xl">
            Search every open role in the Philippines.
          </h1>
        </header>

        <main>
          <JobBoard
            jobs={jobs}
            industries={industries}
            updatedAt={updatedAt}
            updatedLabel={DATE_FORMAT.format(new Date(updatedAt))}
          />
        </main>
      </div>

      {/* Footer — the page's single polarity flip (DESIGN.md black band) */}
      <footer className="bg-ink text-paper">
        <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
          <p className="font-display text-lg font-bold">SimplifyTrabaho</p>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-paper/70">
            Every listing comes straight from the company&apos;s official careers feed
            — public APIs that companies intentionally publish (Greenhouse, Lever,
            Ashby, Workable, SmartRecruiters, Recruitee, BambooHR, Breezy, Manatal)
            and company Workday careers sites. We store facts only and always send
            you to the official application page. No accounts, no cookies, no
            middlemen.
          </p>
          <p className="mt-5 text-sm text-paper/70">
            <a
              href={REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-paper underline underline-offset-2 hover:text-paper/80"
            >
              Open source on GitHub
            </a>{" "}
            · Libre at bukás, para sa lahat.
          </p>
        </div>
      </footer>
    </>
  );
}
