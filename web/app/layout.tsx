import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const SITE_URL = "https://simplifytrabaho.ycells.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "SimplifyTrabaho — jobs at Philippine companies",
  description:
    "A free, open, automatically updated list of jobs at Philippine companies — internships and entry-level roles featured. Always links to official application pages.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "SimplifyTrabaho — jobs at Philippine companies",
    description:
      "A free, open, automatically updated list of jobs at Philippine companies — internships and entry-level roles featured.",
    url: "/",
    siteName: "SimplifyTrabaho",
    locale: "en_PH",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
