import { readFileSync } from "node:fs";
import path from "node:path";
import { ImageResponse } from "next/og";

export const dynamic = "force-static";
export const size = { width: 512, height: 512 };
export const contentType = "image/png";

// Use the checked-in icon-only crop directly so the favicon cannot drift from
// the mark shown in the site header/footer.
const BRAND = readFileSync(
  path.join(process.cwd(), "public", "social", "simplifytrabaho-icon.png"),
);
const BRAND_URI = `data:image/png;base64,${BRAND.toString("base64")}`;

export default function Icon() {
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
