import { ImageResponse } from "next/og";
import { MarkSvg } from "../lib/mark";

export const runtime = "edge";
// OGP 画像。日本語フォントを同梱しないため、英数字だけで構成する(暗い地・マーク・名前・一言)。
export const alt = "WeatherGeoBridge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "#12130f",
        color: "#e4dfda",
        padding: 80,
      }}
    >
      <MarkSvg size={96} rx={20} />
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", fontSize: 104, fontWeight: 700, letterSpacing: -2 }}>
          WeatherGeoBridge
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 32,
            borderTop: "1px solid #3c3c38",
            paddingTop: 24,
            fontSize: 32,
            letterSpacing: 4,
            color: "#8a8a82",
          }}
        >
          WEATHER / MAP / ALERTS
        </div>
      </div>
    </div>,
    { ...size },
  );
}
