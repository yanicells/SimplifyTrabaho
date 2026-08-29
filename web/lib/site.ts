// Single source of truth for site identity. Imported by metadata, the RSS
// feed, robots/sitemap, and page chrome — change the domain here, nowhere else.

export const SITE_URL = "https://simplifytrabaho.ycells.com";
export const REPO_URL = "https://github.com/yanicells/SimplifyTrabaho";
export const REPORT_LISTING_URL = `${REPO_URL}/issues/new?template=report-listing.yml`;
export const SUGGEST_COMPANY_URL = `${REPO_URL}/issues/new?template=add-company.yml`;
export const REPORT_BUG_URL = `${REPO_URL}/issues/new?template=bug-report.yml`;

// Concise and descriptive: brand first (SPEC naming convention), then the two
// intents people actually search for. Search results truncate to device width,
// so there is no guaranteed character cutoff.
export const SITE_TITLE = "SimplifyTrabaho — jobs & internships at Philippine companies";

// A short, readable summary with the site's freshness and official-link
// differentiators. Shared by the meta description, the OG/Twitter cards, and
// the JSON-LD, so they can't disagree.
export const SITE_DESCRIPTION =
  "Free, open job directory checked daily: roles at Philippine companies, including internships and entry-level work. Every listing links to the official application page.";
