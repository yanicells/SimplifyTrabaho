import type { MetadataRoute } from "next";

export const dynamic = "force-static";

// PWA baseline (SPEC §18 Phase 11): installable manifest. PNG icon sizes can
// join once real branding assets exist; modern Chromium accepts the SVG.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SimplifyTrabaho — jobs at Philippine companies",
    short_name: "SimplifyTrabaho",
    description:
      "A free, open, automatically updated list of jobs at Philippine companies — internships and entry-level roles featured.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
