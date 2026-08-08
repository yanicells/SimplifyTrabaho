import { readFileSync } from "node:fs";
import path from "node:path";
import { ImageResponse } from "next/og";

export const dynamic = "force-static";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// iOS home-screen icon. PH traffic is mobile-heavy and "add to home screen" is
// the closest thing this site has to an install, so it gets the centered app
// mark rather than the wider header treatment.
const BRAND = readFileSync(
  path.join(process.cwd(), "public", "social", "simplifytrabaho-mark.png"),
);
const BRAND_URI = `data:image/png;base64,${BRAND.toString("base64")}`;

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#ffffff",
      }}
    >
      <img src={BRAND_URI} width={size.width} height={size.height} alt="" />
    </div>,
    size,
  );
}
