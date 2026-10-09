"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/", label: "トップ" },
  { href: "/atlas", label: "アトラス" },
  { href: "/dashboard", label: "ダッシュボード" },
] as const;

// 固定ナビ。選択中のページだけを塗りつぶしのピルで示す。
export function SiteNav() {
  const pathname = usePathname();

  return (
    <nav className="site-nav" aria-label="ページ移動">
      <Link href="/" className="site-nav__brand">
        WeatherGeoBridge
      </Link>
      <ul className="site-nav__list">
        {ITEMS.map((item) => {
          const active =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={active ? "pill pill--active" : "pill"}
                aria-current={active ? "page" : undefined}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
