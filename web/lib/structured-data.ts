// JSON-LD for search and answer engines. One @graph, emitted once from the
// single page, with every node carrying a stable @id so the nodes reference each
// other instead of repeating themselves.
//
// ---------------------------------------------------------------------------
// Why there is deliberately NO JobPosting markup here
// ---------------------------------------------------------------------------
// It is the obvious thing to reach for on a job board, and it is the wrong thing
// for this one. Google's JobPosting rich result requires `description` — the
// full HTML of the job description — and CLAUDE.md golden rule 3 forbids storing
// job-description text at all. There is no honest way to satisfy both.
//
// Emitting JobPosting without a real description (or with a synthesized one)
// would be scraped-content structured data pointing at a page that does not host
// the posting, which is exactly what Google's job-posting spam policy is aimed
// at, and it would risk a manual action on the whole domain.
//
// The site's actual claim to search traffic is the collection and the open
// dataset behind it, which is what the nodes below describe. Do not "fix" this
// by adding JobPosting.
// ---------------------------------------------------------------------------

import { REPO_URL, SITE_URL } from "./site";

const DATA_URL =
  "https://raw.githubusercontent.com/yanicells/SimplifyTrabaho/main/data/listings.json";
const CC0 = "https://creativecommons.org/publicdomain/zero/1.0/";

const ORGANIZATION_ID = `${SITE_URL}/#organization`;
const WEBSITE_ID = `${SITE_URL}/#website`;
const WEBPAGE_ID = `${SITE_URL}/#webpage`;
const DATASET_ID = `${SITE_URL}/#dataset`;
const LOGO_ID = `${SITE_URL}/#logo`;

export interface GraphInput {
  /** ISO 8601 UTC of the last pipeline run. */
  updatedAt: string;
  /** Active listings — the number the page itself displays. */
  jobCount: number;
  /** Distinct companies across those listings — likewise displayed. */
  companyCount: number;
  /** The page title, shared with the <title> tag. */
  title: string;
  /** The meta description, reused verbatim so the two never disagree. */
  description: string;
}

/** The fields the pipeline stores per listing — mirrors `Listing` in the pipeline. */
const VARIABLES = [
  "company",
  "role title",
  "locations",
  "work setup",
  "level",
  "job function",
  "industry",
  "employer type",
  "employment type",
  "published salary range",
  "date posted",
  "date updated",
  "official application URL",
];

export function buildGraph({
  updatedAt,
  jobCount,
  companyCount,
  title,
  description,
}: GraphInput): object {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": ORGANIZATION_ID,
        name: "SimplifyTrabaho",
        url: SITE_URL,
        description,
        logo: {
          "@type": "ImageObject",
          "@id": LOGO_ID,
          // Raster twin of icon.svg (app/icon.tsx), with a fixed 512px size.
          // web/vercel.json makes the extensionless route serve as image/png.
          url: `${SITE_URL}/icon`,
          contentUrl: `${SITE_URL}/icon`,
          width: 512,
          height: 512,
          caption: "SimplifyTrabaho",
        },
        image: { "@id": LOGO_ID },
        sameAs: [REPO_URL],
        areaServed: { "@type": "Country", name: "Philippines" },
      },
      {
        "@type": "WebSite",
        "@id": WEBSITE_ID,
        url: SITE_URL,
        name: "SimplifyTrabaho",
        alternateName: "Simplify Trabaho",
        description,
        inLanguage: "en-PH",
        publisher: { "@id": ORGANIZATION_ID },
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${SITE_URL}/?q={search_term_string}`,
          },
          "query-input": "required name=search_term_string",
        },
      },
      {
        // CollectionPage, not WebPage: the page IS the list of openings.
        "@type": "CollectionPage",
        "@id": WEBPAGE_ID,
        url: SITE_URL,
        name: title,
        description,
        isPartOf: { "@id": WEBSITE_ID },
        about: { "@id": DATASET_ID },
        mainEntity: { "@id": DATASET_ID },
        inLanguage: "en-PH",
        dateModified: updatedAt,
        primaryImageOfPage: {
          "@type": "ImageObject",
          url: `${SITE_URL}/social/simplifytrabaho-og.png`,
          width: 1200,
          height: 630,
        },
      },
      {
        "@type": "Dataset",
        "@id": DATASET_ID,
        name: "SimplifyTrabaho job listings",
        // Counts come from the same load the page renders, so this description
        // never claims something the visible page doesn't show.
        description:
          `Open dataset of ${jobCount.toLocaleString("en-US")} active job listings at ` +
          `${companyCount.toLocaleString("en-US")} Philippine companies, collected daily from ` +
          "public ATS APIs that companies intentionally publish. Facts only: company, title, " +
          "location, work setup, level, function, industry, published salary, dates, and the " +
          "official application URL. No job-description text and no personal data.",
        url: SITE_URL,
        sameAs: REPO_URL,
        license: CC0,
        isAccessibleForFree: true,
        creator: { "@id": ORGANIZATION_ID },
        publisher: { "@id": ORGANIZATION_ID },
        dateModified: updatedAt,
        inLanguage: "en-PH",
        keywords: [
          "jobs",
          "Philippines",
          "internships",
          "entry level",
          "hiring",
          "labor market",
          "job postings",
        ],
        measurementTechnique:
          "Daily collection from public, unauthenticated ATS APIs published by each company",
        variableMeasured: VARIABLES,
        spatialCoverage: {
          "@type": "Place",
          name: "Philippines",
          address: { "@type": "PostalAddress", addressCountry: "PH" },
        },
        distribution: [
          {
            "@type": "DataDownload",
            name: "Full listings dataset (JSON)",
            encodingFormat: "application/json",
            contentUrl: DATA_URL,
          },
          {
            "@type": "DataDownload",
            name: "Newest openings (RSS)",
            encodingFormat: "application/rss+xml",
            contentUrl: `${SITE_URL}/feed.xml`,
          },
        ],
      },
    ],
  };
}
