"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { CountUp } from "@/components/CountUp";
import { Marquee } from "@/components/Marquee";
import {
  collectCautions,
  formatFetchedAt,
  formatShortTime,
  type SeriesSet,
} from "@/lib/atlas";
import { useReportFetchedAt } from "@/lib/FootnoteContext";
import { JAPAN_CITY_PRESETS } from "@/lib/japanCities";
import "./home.css";

const POINTS = JAPAN_CITY_PRESETS.map((c) => `${c.lat},${c.lon}`).join(";");

// 次の24時間(3時間刻みで8コマ先まで)の予報から注意の目安を拾う。
const TICKER_STEPS = 8;

function Stat({
  label,
  children,
  unit,
}: {
  label: string;
  children: ReactNode;
  unit?: string;
}) {
  return (
    <div className="home__stat">
      <p className="home__stat-label">{label}</p>
      <p className="home__stat-value num">
        {children}
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
  const [failed, setFailed] = useState(false);

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
      .then((data) => {
        if (data.error) setFailed(true);
        else setSeries(data);
      })
      .catch((err) => {
        if (!(err instanceof DOMException && err.name === "AbortError")) setFailed(true);
      });
    return () => controller.abort();
  }, []);

  useReportFetchedAt(series?.fetchedAt ?? null);

  const rangeHours = series ? (series.times.length - 1) * series.stepHours : null;

  const cautions = useMemo(
    () =>
      series
        ? collectCautions(
            series.points,
            JAPAN_CITY_PRESETS.map((c) => c.name),
            series.times,
            0,
            TICKER_STEPS,
          )
        : [],
    [series],
  );

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
        <Stat label="掲載地点" unit="地点">
          <CountUp value={JAPAN_CITY_PRESETS.length} />
        </Stat>
        <Stat label="更新">
          {series ? (
            formatFetchedAt(series.fetchedAt)
          ) : (
            <span className="skeleton skeleton--stat" aria-label="読み込み中" />
          )}
        </Stat>
        <Stat label="予報の範囲" unit={rangeHours === null ? undefined : "時間先"}>
          {rangeHours === null ? (
            <span className="skeleton skeleton--stat" aria-label="読み込み中" />
          ) : (
            <>
              +<CountUp value={rangeHours} />
            </>
          )}
        </Stat>
      </div>

      <div className="home__ticker">
        <p className="home__ticker-label">
          予報の注意 · 次の24時間
          <small>気象庁の警報・注意報ではなく、予報値が目安を超える時刻の抜き出しです</small>
        </p>
        {failed ? (
          <p className="text-muted home__ticker-empty">予報を取得できませんでした。</p>
        ) : series === null ? (
          <span className="skeleton skeleton--ticker" aria-label="読み込み中" />
        ) : cautions.length === 0 ? (
          <p className="text-muted home__ticker-empty">
            次の24時間、目安を超える地点はありません。
          </p>
        ) : (
          <Marquee label="予報の注意">
            {cautions.map((c) => (
              <span key={`${c.name}-${c.caution.kind}`} className="home__ticker-item">
                <strong>{c.name}</strong> {formatShortTime(c.time)} {c.caution.label}
                <span className="text-muted"> {c.caution.detail}</span>
              </span>
            ))}
          </Marquee>
        )}
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
