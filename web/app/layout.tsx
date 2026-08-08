import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { REPO_URL, SITE_URL } from "@/lib/site";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const TITLE = "SimplifyTrabaho — jobs at Philippine companies";
const DESCRIPTION =
  "A free, open, automatically updated list of jobs at Philippine companies — internships and entry-level roles featured. Always links to official application pages.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "jobs Philippines",
    "internships Philippines",
    "entry level jobs Philippines",
    "fresh graduate jobs",
    "OJT",
    "trabaho",
    "careers Philippines",
    "hiring Philippines",
  ],
  alternates: {
    canonical: "/",
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
  },
  // Google Search Console ownership (maintainer-held property, SPEC §18 Phase 12).
  // Removing this un-verifies the property — leave it in place.
  verification: {
    google: "eVLb2lTbuAz4-4MAUUSPkp9ZQe0rHc00MWOyB2LQccg",
  },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
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
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
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
