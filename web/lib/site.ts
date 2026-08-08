// Single source of truth for site identity. Imported by metadata, the RSS
// feed, robots/sitemap, and page chrome — change the domain here, nowhere else.

export const SITE_URL = "https://simplifytrabaho.ycells.com";
export const REPO_URL = "https://github.com/yanicells/SimplifyTrabaho";

// Kept under ~60 chars so Google renders it whole; brand first (SPEC naming
// convention), then the two intents people actually search for.
export const SITE_TITLE = "SimplifyTrabaho — jobs & internships at Philippine companies";

// Kept under ~160 chars for the same reason. "Updated daily" is the freshness
// signal that wins the click against stale aggregators. Shared by the meta
// description, the OG/Twitter cards, and the JSON-LD, so they can't disagree.
export const SITE_DESCRIPTION =
  "Free, open, updated daily: jobs at Philippine companies, with internships and entry-level roles featured. Every listing links to the official application page.";
