import type { MetadataRoute } from "next";

export const dynamic = "force-static";

// PWA baseline (SPEC §18 Phase 11): installable manifest. PH traffic is
// mobile-heavy, so this is a real install surface rather than a checkbox.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "SimplifyTrabaho — jobs at Philippine companies",
    short_name: "SimplifyTrabaho",
    description:
      "A free, open, automatically updated list of jobs at Philippine companies — internships and entry-level roles featured.",
    start_url: "/",
    scope: "/",
    lang: "en-PH",
    dir: "ltr",
    categories: ["business", "education", "productivity"],
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [
      {
        src: "/social/simplifytrabaho-mark.png",
        sizes: "1254x1254",
        type: "image/png",
        purpose: "any",
      },
      // Raster fallback for install surfaces that do not use the static mark;
      // app/icon.tsx generates it from the same source image.
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      // The mark sits on a full-bleed white rounded field inside the safe zone,
      // so the same asset survives Android's adaptive-icon crop.
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
