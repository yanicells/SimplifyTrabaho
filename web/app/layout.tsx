import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { REPO_URL, SITE_DESCRIPTION, SITE_TITLE, SITE_URL } from "@/lib/site";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  // Text paints immediately in the metric-matched fallback rather than going
  // invisible while the webfont loads — protects LCP, which Google measures.
  display: "swap",
});

const TITLE = SITE_TITLE;
const DESCRIPTION = SITE_DESCRIPTION;

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
  // Default policy for anything that leaves the page: send the origin, never
  // the visitor's filter query string. Note this does NOT currently reach the
  // Apply links or the GitHub links — those carry rel="noreferrer", which wins
  // and sends no referrer at all. It is the safe default for links added later
  // without that rel. Whether Apply links should identify SimplifyTrabaho as
  // the traffic source to each ATS is a privacy call for the maintainer, not a
  // side effect of an SEO change.
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-PH" className={`${inter.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        {/* JSON-LD lives in page.tsx, where the listing counts and the refresh
            timestamp it reports are actually in scope. */}
        {children}
        <Analytics />
      </body>
    </html>
  );
}
