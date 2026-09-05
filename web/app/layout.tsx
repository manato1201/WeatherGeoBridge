import { GeistSans } from "geist/font/sans";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "WeatherGeoBridge",
  description: "天気の取得・通知・地図閲覧を行うWebアプリ",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja" className={GeistSans.variable}>
      <body>{children}</body>
    </html>
  );
}
