import { readFileSync } from "node:fs";
import path from "node:path";
import { ImageResponse } from "next/og";

export const dynamic = "force-static";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// iOS home-screen icon. PH traffic is mobile-heavy and "add to home screen" is
// the closest thing this site has to an install, so it gets a real asset rather
// than iOS's default screenshot-of-the-page. Same source mark as icon.tsx; iOS
// applies its own corner mask; the white rounded field gives the crop a
// predictable, friendly background.
const MARK = readFileSync(path.join(process.cwd(), "public", "icon.svg"), "utf8");
const MARK_URI = `data:image/svg+xml;base64,${Buffer.from(MARK).toString("base64")}`;

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
      <img src={MARK_URI} width={size.width} height={size.height} alt="" />
    </div>,
    size,
  );
}
