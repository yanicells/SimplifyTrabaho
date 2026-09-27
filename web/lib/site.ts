// Single source of truth for site identity. Imported by metadata, the RSS
// feed, robots/sitemap, and page chrome — change the domain here, nowhere else.

export const SITE_URL = "https://simplifytrabaho.ycells.com";
export const REPO_URL = "https://github.com/yanicells/SimplifyTrabaho";
export const REPORT_LISTING_URL = `${REPO_URL}/issues/new?template=report-listing.yml`;
export const SUGGEST_COMPANY_URL = `${REPO_URL}/issues/new?template=add-company.yml`;
export const REPORT_BUG_URL = `${REPO_URL}/issues/new?template=bug-report.yml`;

// Brand first (SPEC naming convention), then the phrases people actually type:
// "jobs philippines", "internships philippines", "OJT". Search results truncate
// to device width, so the keywords sit early.
export const SITE_TITLE = "SimplifyTrabaho — Jobs, Internships & OJT in the Philippines";

// A short, readable summary with the search intents (internships, fresh grad,
// remote, cities) and the freshness and official-link differentiators. Shared by
// the meta description, the OG/Twitter cards, and the JSON-LD, so they can't
// disagree.
export const SITE_DESCRIPTION =
  "Find jobs, internships, OJT, and fresh graduate roles at companies in the Philippines — remote, Metro Manila, Cebu, and more. Free, checked daily, and every listing links to the official application page.";

/** Social card, shared by every page's OpenGraph/Twitter metadata. */
export const OG_IMAGE = {
  url: "/social/simplifytrabaho-og.png",
  width: 1200,
  height: 630,
  alt: "SimplifyTrabaho smiling briefcase logo",
};
