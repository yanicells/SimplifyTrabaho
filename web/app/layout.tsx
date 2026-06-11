import type { Metadata, Viewport } from "next";
import { Fraunces, Instrument_Sans } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
});

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-instrument",
});

const SITE_URL = "https://simplifytrabaho.ycells.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "simplifytrabaho — jobs at Philippine companies",
  description:
    "A free, open, automatically updated list of jobs at Philippine companies — internships and entry-level roles featured. Always links to official application pages.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "simplifytrabaho — jobs at Philippine companies",
    description:
      "A free, open, automatically updated list of jobs at Philippine companies — internships and entry-level roles featured.",
    url: "/",
    siteName: "simplifytrabaho",
    locale: "en_PH",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#faf8f4",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${instrumentSans.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
