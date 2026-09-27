import Link from "next/link";
import {
  REPORT_BUG_URL,
  REPORT_LISTING_URL,
  REPO_URL,
  SUGGEST_COMPANY_URL,
} from "@/lib/site";

/**
 * Page frame shared by the home page and every landing page: skip link, brand
 * header with the page's H1 and intro, the board (`children`, inside <main>),
 * any SEO sections (`after`), and the black footer band.
 */
export function SiteShell({
  title,
  intro,
  breadcrumb,
  children,
  after,
}: {
  title: string;
  intro: string;
  breadcrumb?: React.ReactNode;
  children: React.ReactNode;
  after?: React.ReactNode;
}) {
  return (
    <>
      <a
        href="#main-content"
        className="sr-only fixed top-3 left-3 z-50 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-paper focus:not-sr-only focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2"
      >
        Skip to job search
      </a>
      <div className="mx-auto w-full max-w-5xl flex-1 px-4 sm:px-6 lg:px-8">
        <header className="pt-6 pb-2 sm:pt-8">
          <div className="flex items-center justify-between gap-4">
            <Link
              href="/"
              className="flex items-center gap-3 rounded-2xl hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2"
              aria-label="SimplifyTrabaho home"
            >
              {/* Static export has no image optimizer, so plain <img> is deliberate. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/social/simplifytrabaho-icon-192.png"
                width="192"
                height="192"
                alt=""
                aria-hidden="true"
                className="h-14 w-14 shrink-0 rounded-2xl object-contain sm:h-16 sm:w-16"
              />
              <span className="font-display text-xl font-bold tracking-tight">
                SimplifyTrabaho
              </span>
            </Link>
            <a
              href={REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-soft px-4 text-sm font-medium text-ink transition-colors hover:bg-press focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2"
            >
              <svg viewBox="0 0 16 16" className="h-4 w-4 fill-current" aria-hidden>
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
              </svg>
              GitHub
            </a>
          </div>

          {breadcrumb}

          <h1
            className={`${breadcrumb ? "mt-3" : "mt-8"} max-w-2xl text-balance font-display text-4xl font-bold leading-[1.1] sm:text-5xl`}
          >
            {title}
          </h1>

          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-faint sm:text-base">
            {intro}
          </p>
        </header>


        <main id="main-content" tabIndex={-1} className="scroll-mt-4 focus:outline-none">
          {children}
        </main>

        {after}
      </div>

      {/* Footer — the page's single polarity flip (DESIGN.md black band) */}
      <footer className="bg-ink text-paper">
        <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/footer-logo.png"
              width="192"
              height="192"
              alt=""
              aria-hidden="true"
              className="h-14 w-14 shrink-0 rounded-2xl object-contain"
            />
            <p className="font-display text-lg font-bold">SimplifyTrabaho</p>
          </div>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-paper/70">
            Every listing comes straight from the company&apos;s official careers feed — public
            feeds that companies intentionally publish (Greenhouse, Lever, Ashby, Workable,
            SmartRecruiters, Recruitee, BambooHR, Breezy, Manatal, Pinpoint, Rippling,
            Teamtailor) and company Workday careers sites. We store facts only and always send
            you to the official application page. No accounts, no cookies, no middlemen.
          </p>
          <p className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-sm text-paper/70">
            <a
              href={REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-sm font-medium text-paper underline underline-offset-2 hover:text-paper/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-paper"
            >
              Open source on GitHub
            </a>
            <a
              href={REPORT_LISTING_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-sm font-medium text-paper underline underline-offset-2 hover:text-paper/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-paper"
            >
              Report a listing
            </a>
            <a
              href={SUGGEST_COMPANY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-sm font-medium text-paper underline underline-offset-2 hover:text-paper/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-paper"
            >
              Suggest a company
            </a>
            <a
              href={REPORT_BUG_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-sm font-medium text-paper underline underline-offset-2 hover:text-paper/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-paper"
            >
              Report a site bug
            </a>
          </p>
        </div>
      </footer>
    </>
  );
}
