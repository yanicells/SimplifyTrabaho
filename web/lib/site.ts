// Single source of truth for site identity. Imported by metadata, the RSS
// feed, robots/sitemap, and page chrome — change the domain here, nowhere else.

export const SITE_URL = "https://simplifytrabaho.ycells.com";
export const REPO_URL = "https://github.com/yanicells/SimplifyTrabaho";
export const REPORT_LISTING_URL = `${REPO_URL}/issues/new?template=report-listing.yml`;
export const SUGGEST_COMPANY_URL = `${REPO_URL}/issues/new?template=add-company.yml`;
export const REPORT_BUG_URL = `${REPO_URL}/issues/new?template=bug-report.yml`;

// Brand first (SPEC naming convention), then the phrases people actually type:
// "jobs philippines", "internships", "OJT". Search results truncate to device
// width, so the keywords sit early.
export const SITE_TITLE = "SimplifyTrabaho — Jobs, Internships & OJT in the Philippines";

// What Google shows under the title, so it carries the search intents people
// type (OJT, fresh grad, work from home, Manila/Cebu, IT) in plain sentences.
// Shared by the meta description, the OG/Twitter cards, and the JSON-LD, so
// they can't disagree.
export const SITE_DESCRIPTION =
  "Find jobs, internships, OJT, and fresh graduate roles at companies hiring in the Philippines — work from home, Metro Manila, Makati, BGC, Cebu, and more. IT, accounting, customer service, and every other field. Free, checked daily, with official apply links.";
