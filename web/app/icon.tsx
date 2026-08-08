import { readFileSync } from "node:fs";
import path from "node:path";
import { ImageResponse } from "next/og";

export const dynamic = "force-static";
export const size = { width: 512, height: 512 };
export const contentType = "image/png";

// Raster twin of public/icon.svg, generated at build time from that same file so
// the mark cannot drift between formats. The PNG gives manifests and search
// consumers a conventional fixed-size fallback alongside the SVG.
const MARK = readFileSync(path.join(process.cwd(), "public", "icon.svg"), "utf8");
const MARK_URI = `data:image/svg+xml;base64,${Buffer.from(MARK).toString("base64")}`;

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#000000",
      }}
    >
      <img src={MARK_URI} width={size.width} height={size.height} alt="" />
    </div>,
    size,
  );
}
