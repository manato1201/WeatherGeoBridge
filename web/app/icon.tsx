import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0a0a0a",
        borderRadius: 6,
        color: "#fafafa",
        fontSize: 20,
        fontWeight: 600,
        fontFamily: "sans-serif",
      }}
    >
      W
    </div>,
    { ...size },
  );
}
