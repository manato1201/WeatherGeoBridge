import { ImageResponse } from "next/og";

export const runtime = "edge";

export function GET() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#12130f",
        borderRadius: 32,
        color: "#e4dfda",
        fontSize: 96,
        fontWeight: 600,
        fontFamily: "sans-serif",
      }}
    >
      W
    </div>,
    { width: 192, height: 192 },
  );
}
