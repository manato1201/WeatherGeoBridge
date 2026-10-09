"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { formatFetchedAt, type SeriesSet } from "@/lib/atlas";
import { useReportFetchedAt } from "@/lib/FootnoteContext";
import { JAPAN_CITY_PRESETS } from "@/lib/japanCities";
import "./home.css";

const POINTS = JAPAN_CITY_PRESETS.map((c) => `${c.lat},${c.lon}`).join(";");

function Stat({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit?: string;
}) {
  return (
    <div className="home__stat">
      <p className="home__stat-label">{label}</p>
      <p className="home__stat-value num">
        {value}
        {unit && <small>{unit}</small>}
      </p>
    </div>
  );
}

// トップ(IMPROVEMENT_DESIGN_2026-10.md 4.2): 見出し + 主要数値3つ + 「地図を開く」。
// 差し色は見出しの1語だけ。
export default function HomePage() {
  const router = useRouter();
  const [series, setSeries] = useState<SeriesSet | null>(null);

  // 以前は「/」がダッシュボードだった。?lat=&lon= 付きの共有リンクは
  // 移動先の /dashboard へそのまま引き継ぐ。
  useEffect(() => {
    const search = window.location.search;
    const params = new URLSearchParams(search);
    if (params.has("lat") && params.has("lon")) {
      router.replace(`/dashboard${search}`);
    }
  }, [router]);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/weather/series?points=${encodeURIComponent(POINTS)}`, {
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((data) => setSeries(data.error ? null : data))
      .catch(() => {});
    return () => controller.abort();
  }, []);

  useReportFetchedAt(series?.fetchedAt ?? null);

  const rangeHours = series ? (series.times.length - 1) * series.stepHours : null;

  return (
    <main className="home">
      <p className="eyebrow">WEATHER ATLAS</p>
      <h1 className="home__title">
        天気を、<em>地図</em>の上で読む。
      </h1>
      <p className="home__lead">
        気温・降水・風を、色と高さと時間でひと目に。
      </p>

      <div className="home__stats">
        <Stat label="掲載地点" value={String(JAPAN_CITY_PRESETS.length)} unit="地点" />
        <Stat label="更新" value={formatFetchedAt(series?.fetchedAt ?? null)} />
        <Stat
          label="予報の範囲"
          value={rangeHours === null ? "—" : `+${rangeHours}`}
          unit={rangeHours === null ? undefined : "時間先"}
        />
      </div>

      <div className="home__cta">
        <Link href="/atlas" className="btn btn--primary">
          地図を開く →
        </Link>
        <Link href="/dashboard" className="btn btn--outline">
          ダッシュボード →
        </Link>
      </div>
    </main>
  );
}
