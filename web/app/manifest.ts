import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "WeatherGeoBridge",
    short_name: "WeatherGeoBridge",
    description: "天気の取得・通知・地図閲覧",
    start_url: "/",
    display: "standalone",
    background_color: "#f5f5f5",
    theme_color: "#0a0a0a",
    icons: [
      { src: "/icon-192", sizes: "192x192", type: "image/png" },
      { src: "/icon-512", sizes: "512x512", type: "image/png" },
    ],
  };
}
