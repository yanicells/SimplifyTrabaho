import { ImageResponse } from "next/og";

export const dynamic = "force-static";
export const alt = "SimplifyTrabaho — jobs at Philippine companies";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// OG share card, generated at build time. Mirrors the site: ink canvas, white
// type, PH flag strip, sun-yellow accent.
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#000000",
          color: "#ffffff",
          padding: "72px 80px",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "1200px",
            height: "12px",
            display: "flex",
            background: "linear-gradient(to right, #0038a8, #ce1126, #fcd116)",
          }}
        />
        <div style={{ fontSize: 36, fontWeight: 700, display: "flex" }}>
          SimplifyTrabaho
        </div>
        <div
          style={{
            marginTop: 96,
            fontSize: 84,
            fontWeight: 700,
            lineHeight: 1.1,
            letterSpacing: "-2px",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <span>Every job at Philippine</span>
          <span style={{ display: "flex" }}>
            companies.&nbsp;<span style={{ color: "#fcd116" }}>One list.</span>
          </span>
        </div>
        <div
          style={{
            marginTop: "auto",
            fontSize: 30,
            color: "#afafaf",
            display: "flex",
          }}
        >
          Free · open · updated daily · straight to official applications
        </div>
      </div>
    ),
    size,
  );
}
