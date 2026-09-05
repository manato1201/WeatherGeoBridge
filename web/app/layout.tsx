import { GeistSans } from "geist/font/sans";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import Script from "next/script";
import { ThemeProvider } from "@/lib/ThemeContext";
import { UnitsProvider } from "@/lib/UnitsContext";
import "./globals.css";

export const metadata: Metadata = {
  title: "WeatherGeoBridge",
  description: "天気の取得・通知・地図閲覧を行うWebアプリ",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "WeatherGeoBridge",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
};

// data-theme属性を初回ペイント前に設定し、暗い設定を保存済みのユーザーで
// 一瞬ライトテーマが表示される(FOUC)のを防ぐ。ThemeContext.tsxの
// STORAGE_KEYと同じキーを参照する。
const THEME_INIT_SCRIPT = `
(function () {
  try {
    var theme = localStorage.getItem("weathergeobridge:theme");
    if (theme === "light" || theme === "dark") {
      document.documentElement.setAttribute("data-theme", theme);
    }
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja" className={GeistSans.variable}>
      <body>
        <Script id="theme-init" strategy="beforeInteractive">
          {THEME_INIT_SCRIPT}
        </Script>
        <ThemeProvider>
          <UnitsProvider>{children}</UnitsProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
