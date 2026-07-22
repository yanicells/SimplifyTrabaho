# How the listings get here

Every job on SimplifyTrabaho was fetched from a careers feed the employer publishes
themselves. Nothing is scraped off LinkedIn, JobStreet, Indeed, Kalibrr, or any other
job board. This page explains what the pipeline does and why it works that way.

## What the project is trying to do

Job hunting in the Philippines means opening the same twenty careers pages every week
to see if anything new went up. Aggregators solve that by putting a login, an ad load,
and a re-hosted copy of the posting between you and the employer. The goal here is the
boring middle option: one list, updated once a day, where every Apply button goes
straight to the company's real application form.

Interns and fresh grads get the front page because that group has the worst version of
the problem. Someone with eight years of experience gets messaged by recruiters.
A student looking for an OJT slot is refreshing careers pages manually.

## Where the data comes from

Modern companies do not hand-build their careers pages. They run an applicant tracking
system (an ATS), and that ATS serves the job list to the page over a public JSON
endpoint. Open your browser's network tab on almost any startup's careers page and you
will see the request go out. No key, no login, no terms to click through.

That endpoint is the entire data source. The pipeline calls the same URL the company's
own page calls, reads the same JSON, and stores a subset of it.

Ten systems are supported right now. Company counts below are a snapshot of the
registry on 2026-07-21, not a live figure:

| ATS | Companies |
| --- | --- |
| Workable | 54 |
| Manatal | 21 |
| Greenhouse | 16 |
| SmartRecruiters | 16 |
| Workday | 15 |
| Ashby | 14 |
| Lever | 13 |
| Breezy | 4 |
| Recruitee | 2 |
| BambooHR | 2 |

The first nine work the same way: one documented JSON endpoint per company, keyed by
whatever slug the company registered (`boards-api.greenhouse.io/v1/boards/<slug>/jobs`,
and so on). Workday is the odd one out and gets stricter handling, described below.

## The rules that shape everything else

Four constraints do most of the design work.

**Only endpoints the company already publishes.** No scraping of aggregators, no
logged-in APIs, no working around a block. If a company's ATS does not expose a public
board, that company simply is not in the list.

**Facts only, no descriptions.** The stored record is company, title, locations, work
setup, salary if the ATS publishes a structured one, the application URL, and dates.
The job description text is never copied, which sidesteps the copyright question
entirely and keeps the dataset small enough to commit to git. Recruiter names and
emails are dropped during normalization, so no personal data lands in the repo.

**Always link out.** There is no internal job page, no "apply through us" flow, and no
tracking of who clicked what. The listing exists to point at the employer.

**Be a good guest.** At least one second between requests, a User-Agent that says who
this is and links to the repo (`simplifytrabaho/0.1.0 (+https://github.com/…)`), and one
scheduled full run per day. A full run takes a while because of that pacing, which is
fine. Nothing here is time-sensitive to the minute.

Workday sites get extra treatment because they are company-hosted rather than a
documented public API. Before the first request to a tenant, the pipeline reads that
host's `robots.txt` and checks whether the jobs path is allowed. A missing robots file
is treated as permission; anything else that is not a clean allow is treated as a
closed door. If a Workday host ever answers with 401, 403, 422, 429, or a non-JSON bot
challenge, that company is marked blocked permanently and never retried. No user-agent
rotation, no proxies, no headless browser. A block is an answer, not an obstacle.

## What one daily run does

The scheduled run happens at 6:00 AM Manila time and goes through five stages.

It fetches every verified company in the registry, one at a time, with the polite delay
between calls. Failures are recorded and the run continues, because one dead slug should
not cost you the other 156 companies.

It filters to Philippine roles. Company boards are global, so most of what comes back
gets discarded. A keyword list covering the country, the metros, and the major cities
decides what stays, matched on word boundaries so "PH" never matches inside "Memphis".
Rejected locations are logged as a sample on every run, which is how missing cities get
found.

It categorizes each title into a level and a job function using keyword rules on the
published title. This part is deliberately dumb: first match wins, tables live in one
file, and `unknown` is an acceptable answer. Guessing would be worse than admitting the
title is ambiguous.

It merges against the existing data. New URLs are added, changed ones are updated, and
anything that vanished from a feed the pipeline successfully fetched is marked
`active: false` rather than deleted. Nothing is ever removed from the file, so the
history stays in git and a temporary fetch failure cannot wipe a company's roles.

It writes `data/listings.json` and regenerates `README.md`, then the workflow commits
both only if something actually changed.

As of the 2026-07-21 run that produces 6,632 active listings out of 8,313 total records,
across 157 companies. The live counts are in the README, which the same run regenerates.

## What the numbers do not tell you

The registry is hand-curated, and that is the real work. Every company in
`pipeline/companies.json` was checked by hand: find the careers page, identify the ATS,
confirm the slug returns live JSON, tag the industry, mark whether it is a direct
employer or a staffing agency. A company only becomes `verified: true` after its
endpoint answers.

Slugs rot. Companies migrate between systems, rename their board, or close it. The
failures from each run get logged rather than silently swallowed, and dead slugs are
fixed by hand.

Level detection is imperfect and always will be, because titles are written by humans
in a hurry. A few examples of what that means in practice: "HR Officer" is staff level
in the Philippines even though "officer" sounds senior elsewhere, so bare "officer" is
not treated as a senior marker. BPO frontline titles like CSR and TSR are entry level by
local convention. "Analyst I" is the first rung of a ladder, but "Mid Shift" is a
schedule and not a level at all. Every one of those rules came from looking at real
titles that had been categorized wrong.

---

# Code walkthrough

## Layout

`pipeline/` is a TypeScript CLI. `pipeline/companies.json` is the registry. `pipeline/src/`
holds one module per stage. `data/listings.json` is the committed output. `web/` is a
Next.js static export that reads that JSON at build time, so the site has no backend and
no database.

Everything is strict-mode TypeScript with one shared `Listing` type in
[types.ts](../pipeline/src/types.ts), which every stage passes around.

## The polite HTTP layer

[fetchers/http.ts](../pipeline/src/fetchers/http.ts) is the only way the pipeline talks
to the network. It sleeps a second before every request, sets the identifying
User-Agent, retries up to three times with exponential backoff on 429 and 5xx, and never
retries a 404.

It returns a tagged union instead of throwing:

```ts
export type HttpOutcome =
  | { kind: "ok"; body: unknown }
  | { kind: "not-found" }
  | { kind: "http"; status: number }
  | { kind: "network"; message: string };
```

That shape matters. A 404 means the slug is dead and should be logged for a human, while
a 500 means try again later. Collapsing both into an exception would lose that
distinction, and the run summary is the main tool for spotting rot in the registry.

There is one opt-in flag, `redirectIsNotFound`. BambooHR and Breezy answer an unknown
tenant with a 302 to a marketing page instead of a 404, so those two fetchers treat a
redirect as a dead slug. It is off by default so the older fetchers keep their original
behavior.

## Fetchers

One module per ATS in [fetchers/](../pipeline/src/fetchers), each responsible for
building the URL and mapping the response into a common `FetchedPosting`. Adding a
system means writing one file and adding a case in the CLI. The shape differences
between systems (Greenhouse nests locations, Lever flattens them, Ashby uses its own
enum for remote status) stay contained in that one file.

[workday.ts](../pipeline/src/fetchers/workday.ts) carries the guardrails. Two of them
are worth reading if you touch this code: `robotsAllowsJobsPath` runs before the first
byte is fetched from a tenant, and `BLOCK_STATUSES` triggers a permanent stop rather
than a retry. Both are deliberately conservative. When the robots file is unreadable for
any reason other than "does not exist", the company is skipped.

## Filter, categorize, merge

[filter.ts](../pipeline/src/filter.ts) holds `PH_LOCATION_KEYWORDS` as a single exported
list. Word-boundary matching is the whole trick, and the rejected-location sample printed
by each run is how the list grows.

[categorize.ts](../pipeline/src/categorize.ts) is ordered regex matching, and the order
is load-bearing. Internship beats entry, "Senior Associate" is checked before bare
"associate" so it does not get demoted, and the frontline BPO rule runs after the senior
and mid markers so "Senior CSR" stays senior. Each deviation from the original spec has
a dated comment explaining which real title forced it.

[merge.ts](../pipeline/src/merge.ts) keys listings by a stable ID: the first 12 hex
characters of the SHA-256 of the application URL. Same posting, same ID, across runs and
across machines. Deactivation only happens for feeds that were fetched successfully, so
a network failure cannot mass-deactivate a company by accident.

[feed.ts](../pipeline/src/feed.ts) fixes an ordering problem that only shows up at scale.
Sorting purely by date put Accenture's 587 same-day postings in one unbroken block, which
made the board look like a single-company site. `interleaveByCompany` round-robins across
companies inside each posted-day bucket, so recency by day survives while no company owns
a long stretch. The web board and the README table share this function, which is why both
read the same way.

## Generated output

[readme.ts](../pipeline/src/readme.ts) generates the root `README.md` on every run,
including the featured table of internship and entry-level roles from the last 30 days,
capped at 200 rows and interleaved before capping. Editing `README.md` by hand does
nothing, since the next run overwrites it. Change the generator instead.

`data/listings.json` is written with a stable sort (company ascending, then date posted
descending) so the daily commit produces a diff a human can actually read.

## Tests

[pipeline/tests/](../pipeline/tests) covers the parts where a silent mistake would be
expensive: categorization against real titles, the PH filter, merge lifecycle including
deactivation, the Workday guardrails, feed interleaving, README generation, and file
parsing. Fixtures are captured from real ATS responses rather than invented, because the
useful bugs come from shapes nobody would think to make up.

The web app has its own tests for the filter URL codec, since the address bar is the
sharing mechanism and a broken round-trip means broken links.

## Running it

```
pnpm install
pnpm refresh              # full pipeline: fetch, then write listings.json and README.md
pnpm --filter web dev     # the site locally
pnpm test                 # everything
```

`pnpm refresh` hits the network for every verified company with a one-second gap, so it
is not quick. The GitHub Action in
[.github/workflows/refresh.yml](../.github/workflows/refresh.yml) runs it daily and
commits only when the data changed.

## Adding a company

Add an entry to `pipeline/companies.json` with the ATS, the slug, the industry tag, and
the employer type, then confirm the endpoint returns live JSON before setting
`verified: true`. The pipeline skips anything unverified.

Companies on the nine documented APIs can go straight in. Workday companies come in by
pull request only, with the robots.txt evidence attached, because that path deserves a
second pair of eyes.
