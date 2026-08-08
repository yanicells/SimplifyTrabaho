import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { REPO_URL, SITE_URL } from "@/lib/site";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  // Text paints immediately in the metric-matched fallback rather than going
  // invisible while the webfont loads — protects LCP, which Google measures.
  display: "swap",
});

// Kept under ~60 chars so Google renders it whole; brand first (SPEC naming
// convention), then the two intents people actually search for.
const TITLE = "SimplifyTrabaho — jobs & internships at Philippine companies";
// Kept under ~160 chars for the same reason. "Updated daily" is the freshness
// signal that wins the click against stale aggregators.
const DESCRIPTION =
  "Free, open, updated daily: jobs at Philippine companies, with internships and entry-level roles featured. Every listing links to the official application page.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: TITLE, template: "%s — SimplifyTrabaho" },
  description: DESCRIPTION,
  applicationName: "SimplifyTrabaho",
  category: "Jobs & Careers",
  authors: [{ name: "SimplifyTrabaho contributors", url: REPO_URL }],
  creator: "SimplifyTrabaho",
  publisher: "SimplifyTrabaho",
  keywords: [
    "jobs Philippines",
    "internships Philippines",
    "entry level jobs Philippines",
    "fresh graduate jobs Philippines",
    "OJT",
    "trabaho",
    "careers Philippines",
    "hiring Philippines",
    "remote jobs Philippines",
    "work from home Philippines",
    "Metro Manila jobs",
    "job openings Philippines",
  ],
  // Salary strings ("₱25,000 - ₱35,000") otherwise get auto-linked as phone
  // numbers by iOS Safari, which mangles the copy crawlers and users see.
  formatDetection: { telephone: false, address: false, email: false },
  // ATS sites see us as the referrer (good for the relationships this project
  // depends on) without leaking the visitor's filter query string.
  referrer: "origin-when-cross-origin",
  alternates: {
    canonical: "/",
    // Single-locale site, but declaring it stops Google from guessing, and
    // x-default keeps non-PH searchers pointed at the same page.
    languages: { "en-PH": "/", "x-default": "/" },
    types: { "application/rss+xml": `${SITE_URL}/feed.xml` },
  },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "/",
    siteName: "SimplifyTrabaho",
    locale: "en_PH",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    // Uncapped snippets + large image previews: this is a listings page whose
    // value in the SERP is the detail, and the OG card is worth showing big.
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
  // Google Search Console ownership (maintainer-held property, SPEC §18 Phase 12).
  // Removing this un-verifies the property — leave it in place.
  verification: {
    google: "eVLb2lTbuAz4-4MAUUSPkp9ZQe0rHc00MWOyB2LQccg",
  },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  // The design system is light-only (globals.css defines no dark tokens).
  // Declaring it stops Android Chrome's auto-dark from inverting the page into
  // a contrast-broken version of itself.
  colorScheme: "light",
};

// Structured data for search + answer engines: the site itself (with its query
// param as a SearchAction) and the CC0 dataset behind it.
const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: "SimplifyTrabaho",
      description: DESCRIPTION,
      inLanguage: "en-PH",
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
      "@type": "Dataset",
      "@id": `${SITE_URL}/#dataset`,
      name: "SimplifyTrabaho job listings",
      description:
        "Open dataset of job listings at Philippine companies, collected daily from public ATS APIs that companies intentionally publish. Facts only: company, title, location, official application URL, dates.",
      url: REPO_URL,
      license: "https://creativecommons.org/publicdomain/zero/1.0/",
      isAccessibleForFree: true,
      creator: { "@type": "Organization", name: "SimplifyTrabaho" },
      distribution: {
        "@type": "DataDownload",
        encodingFormat: "application/json",
        contentUrl:
          "https://raw.githubusercontent.com/yanicells/SimplifyTrabaho/main/data/listings.json",
      },
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-PH" className={`${inter.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
        />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
