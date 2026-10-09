import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import Script from "next/script";
import { Footnote } from "@/components/Footnote";
import { SiteNav } from "@/components/SiteNav";
import { FootnoteProvider } from "@/lib/FootnoteContext";
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
  themeColor: "#12130f",
};

// data-theme属性を初回ペイント前に設定し、保存済みの設定と違うテーマが
// 一瞬表示される(FOUC)のを防ぐ。ThemeContext.tsxのSTORAGE_KEYと同じキーを
// 参照する。保存値が無ければ既定のライトにする("system"保存済みの場合だけ
// 属性なし=OS設定に従う)。
const THEME_INIT_SCRIPT = `
(function () {
  try {
    var theme = localStorage.getItem("weathergeobridge:theme");
    if (theme === "system") return;
    document.documentElement.setAttribute(
      "data-theme",
      theme === "dark" ? "dark" : "light"
    );
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: ReactNode }) {
  // data-themeは初回ペイント前のインラインスクリプトが付けるため、サーバーの
  // HTMLとの差分は意図したもの(suppressHydrationWarningで警告を抑止する)。
  return (
    <html
      lang="ja"
      className={`${GeistSans.variable} ${GeistMono.variable}`}
      suppressHydrationWarning
    >
      <body>
        <Script id="theme-init" strategy="beforeInteractive">
          {THEME_INIT_SCRIPT}
        </Script>
        <ThemeProvider>
          <UnitsProvider>
            <FootnoteProvider>
              <SiteNav />
              {children}
              <Footnote />
            </FootnoteProvider>
          </UnitsProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
