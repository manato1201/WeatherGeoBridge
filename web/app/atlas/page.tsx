"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AtlasLegend } from "@/components/atlas/AtlasLegend";
import { AtlasMap, type AtlasView } from "@/components/atlas/AtlasMap";
import { CityList, type CityRow } from "@/components/atlas/CityList";
import { RainLoader } from "@/components/RainLoader";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  formatFetchedAt,
  formatTimeLabel,
  METRICS,
  type AtlasMetric,
  type GridSeriesSet,
  type SeriesSet,
} from "@/lib/atlas";
import {
  addFavorite,
  loadFavorites,
  removeFavorite,
  type FavoriteLocation,
} from "@/lib/favorites";
import { useReportFetchedAt } from "@/lib/FootnoteContext";
import { JAPAN_CITY_PRESETS } from "@/lib/japanCities";
import { useTheme } from "@/lib/ThemeContext";
import { parseLatLon } from "@/lib/validation";
import "./atlas.css";

const DEFAULT_LOCATION = { lat: 35.6812, lon: 139.7671 };
const MAX_LIST_POINTS = 40;
const PLAY_INTERVAL_MS = 900;
const METRIC_ORDER: AtlasMetric[] = ["temperature", "precipitation", "wind"];

function near(aLat: number, aLon: number, bLat: number, bLon: number): boolean {
  return Math.abs(aLat - bLat) < 0.005 && Math.abs(aLon - bLon) < 0.005;
}

function initialLocation(): { lat: number; lon: number } {
  const params = new URLSearchParams(window.location.search);
  return parseLatLon(params.get("lat"), params.get("lon")) ?? DEFAULT_LOCATION;
}

// 3Dが重くなりやすい端末(狭い画面・少メモリ)では既定を2Dにする(P10)。
function defaultView(): AtlasView {
  const narrow = window.innerWidth < 768;
  const lowMemory =
    (navigator as Navigator & { deviceMemory?: number }).deviceMemory !== undefined &&
    ((navigator as Navigator & { deviceMemory?: number }).deviceMemory as number) < 4;
  return narrow || lowMemory ? "flat" : "3d";
}

export default function AtlasPage() {
  const { resolvedTheme } = useTheme();
  const [metric, setMetric] = useState<AtlasMetric>("temperature");
  const [view, setView] = useState<AtlasView>("flat");
  const [timeIndex, setTimeIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [selected, setSelected] = useState<{ lat: number; lon: number } | null>(null);
  const [grid, setGrid] = useState<GridSeriesSet | null>(null);
  const [gridError, setGridError] = useState<string | null>(null);
  const [gridLoading, setGridLoading] = useState(false);
  const [listSeries, setListSeries] = useState<SeriesSet | null>(null);
  const [favorites, setFavorites] = useState<FavoriteLocation[]>([]);
  const [infoOpen, setInfoOpen] = useState(false);
  const [retryTick, setRetryTick] = useState(0);

  useEffect(() => {
    setSelected(initialLocation());
    setView(defaultView());
    setFavorites(loadFavorites());
  }, []);

  const handleSelect = useCallback((location: { lat: number; lon: number }) => {
    setSelected(location);
    const params = new URLSearchParams(window.location.search);
    params.set("lat", location.lat.toFixed(4));
    params.set("lon", location.lon.toFixed(4));
    window.history.replaceState(null, "", `?${params.toString()}`);
  }, []);

  // 左一覧: 主要都市 + お気に入り(上限あり)。同じ座標の重複は1行にまとめる。
  const rows: CityRow[] = useMemo(() => {
    const presetRows: CityRow[] = JAPAN_CITY_PRESETS.map((p) => ({
      id: `p:${p.name}`,
      name: p.name,
      romaji: p.romaji,
      lat: p.lat,
      lon: p.lon,
      favorite: favorites.some((f) => near(f.lat, f.lon, p.lat, p.lon)),
    }));
    const extra: CityRow[] = favorites
      .filter((f) => !JAPAN_CITY_PRESETS.some((p) => near(f.lat, f.lon, p.lat, p.lon)))
      .map((f) => ({
        id: `f:${f.lat.toFixed(3)},${f.lon.toFixed(3)}`,
        name: f.name,
        lat: f.lat,
        lon: f.lon,
        favorite: true,
      }));
    return [...presetRows, ...extra].slice(0, MAX_LIST_POINTS);
  }, [favorites]);

  const rowsKey = rows.map((r) => `${r.lat.toFixed(4)},${r.lon.toFixed(4)}`).join(";");

  // 一覧の予報系列(地点の並びが変わったときだけ取得し直す)。
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/weather/series?points=${encodeURIComponent(rowsKey)}`, {
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((data) => setListSeries(data.error ? null : data))
      .catch(() => {});
    return () => controller.abort();
  }, [rowsKey, retryTick]);

  // 地図のメッシュ(選択地点を中心に取得。Worker側で格子に丸めてキャッシュされる)。
  useEffect(() => {
    if (!selected) return;
    const controller = new AbortController();
    setGridLoading(true);
    setGridError(null);
    fetch(`/api/weather/grid?lat=${selected.lat}&lon=${selected.lon}&span=2.4&n=8`, {
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setGrid(data);
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setGridError(err instanceof Error ? err.message : "メッシュ予報の取得に失敗しました");
      })
      .finally(() => {
        if (!controller.signal.aborted) setGridLoading(false);
      });
    return () => controller.abort();
  }, [selected, retryTick]);

  useReportFetchedAt(grid?.fetchedAt ?? listSeries?.fetchedAt ?? null);

  const times = grid?.times ?? listSeries?.times ?? [];
  const lastIndex = Math.max(0, times.length - 1);
  const safeIndex = Math.min(timeIndex, lastIndex);
  // メッシュと左一覧は別々にキャッシュされ取得時刻がずれうるため、添字ではなく
  // 「時刻の文字列」で突き合わせる(スライダーの時刻と値の時刻を必ず一致させる)。
  const currentTime = times[safeIndex];
  const listIndex = listSeries && currentTime ? listSeries.times.indexOf(currentTime) : -1;

  useEffect(() => {
    if (!playing || times.length === 0) return;
    const id = setInterval(() => {
      setTimeIndex((i) => (i >= times.length - 1 ? 0 : i + 1));
    }, PLAY_INTERVAL_MS);
    return () => clearInterval(id);
  }, [playing, times.length]);

  const toggleFavorite = useCallback(
    (row: CityRow) => {
      if (row.favorite) {
        const match = favorites.find((f) => near(f.lat, f.lon, row.lat, row.lon));
        if (match) setFavorites(removeFavorite(match.name));
      } else {
        setFavorites(addFavorite({ name: row.name, lat: row.lat, lon: row.lon }));
      }
    },
    [favorites],
  );

  const dayTicks = times
    .map((t, i) => ({ t, i }))
    .filter(({ t }) => t.endsWith("T00:00"))
    .map(({ t, i }) => ({
      left: lastIndex === 0 ? 0 : (i / lastIndex) * 100,
      label: `${Number(t.slice(5, 7))}/${Number(t.slice(8, 10))}`,
    }));

  return (
    <main className="atlas">
      <section className="atlas__left card" aria-label="地点">
        <header className="atlas__brand">
          <h1 className="atlas__title">天気アトラス</h1>
          <p className="text-caption num">
            地点数 {rows.length} · 更新 {formatFetchedAt(listSeries?.fetchedAt ?? grid?.fetchedAt ?? null)}
          </p>
        </header>
        <CityList
          rows={rows}
          series={listSeries?.points ?? null}
          timeIndex={listIndex}
          metric={metric}
          selected={selected}
          onSelect={handleSelect}
          onToggleFavorite={toggleFavorite}
        />
      </section>

      <div className="atlas__top">
        <div className="seg" role="group" aria-label="表示する値">
          {METRIC_ORDER.map((m) => (
            <button
              key={m}
              type="button"
              className="seg__btn"
              aria-pressed={metric === m}
              onClick={() => setMetric(m)}
            >
              {METRICS[m].label}
            </button>
          ))}
        </div>
        <div className="seg" role="group" aria-label="地図の表示方法">
          <button
            type="button"
            className="seg__btn"
            aria-pressed={view === "flat"}
            onClick={() => setView("flat")}
          >
            平面
          </button>
          <button
            type="button"
            className="seg__btn"
            aria-pressed={view === "3d"}
            onClick={() => setView("3d")}
          >
            立体
          </button>
        </div>
        <ThemeToggle />
        <button
          type="button"
          className="btn btn--outline"
          aria-expanded={infoOpen}
          aria-controls="atlas-info"
          onClick={() => setInfoOpen((v) => !v)}
        >
          ⓘ 読み方 {infoOpen ? "▲" : "▼"}
        </button>
      </div>

      <section className="atlas__map-wrap" aria-label="地図">
        {selected && (
          <AtlasMap
            grid={grid}
            metric={metric}
            timeIndex={safeIndex}
            view={view}
            selected={selected}
            theme={resolvedTheme}
          />
        )}
        <AtlasLegend metric={metric} view={view} />
        {(gridLoading || gridError) && (
          <div className="atlas__status">
            {gridLoading && !gridError && <RainLoader label="メッシュ予報を取得中" />}
            {gridError && (
              <>
                <span className="text-destructive">{gridError}</span>{" "}
                <button
                  type="button"
                  className="btn btn--outline"
                  onClick={() => setRetryTick((t) => t + 1)}
                >
                  再試行
                </button>
              </>
            )}
          </div>
        )}
        {infoOpen && (
          <div id="atlas-info" className="atlas__info card">
            <p>
              <strong>データ:</strong> Open-Meteoの予報値(約
              {grid ? (grid.grid.step * 111).toFixed(0) : "30"}
              km間隔の格子点)。観測値ではありません。
            </p>
            <p>
              <strong>色:</strong> 気温=暖色、降水(確率)=青、風=灰。色だけでなく凡例の数値と、
              地図をクリックしたときの数値でも読めます。
            </p>
            <p>
              <strong>立体:</strong> 値に比例して高さが立ち上がります(凡例に倍率を表示)。重い場合は「平面」へ。
            </p>
            <p>
              <strong>注意:</strong> 予報であって保証ではありません。最終判断は気象庁の予報で。
            </p>
          </div>
        )}
      </section>

      <section className="atlas__bottom card" aria-label="予報時刻">
        <div className="atlas__bottom-row">
          <button
            type="button"
            className="btn btn--outline"
            onClick={() => setPlaying((p) => !p)}
            disabled={times.length === 0}
            aria-label={playing ? "一時停止" : "再生"}
          >
            {playing ? "❚❚ 一時停止" : "▶ 再生"}
          </button>
          <div className="atlas__slider">
            <input
              type="range"
              min={0}
              max={lastIndex}
              step={1}
              value={safeIndex}
              disabled={times.length === 0}
              aria-label="予報時刻"
              aria-valuetext={times[safeIndex] ? formatTimeLabel(times[safeIndex]) : "未取得"}
              onChange={(e) => {
                setPlaying(false);
                setTimeIndex(Number(e.target.value));
              }}
            />
            <div className="atlas__ticks" aria-hidden="true">
              {dayTicks.map((d) => (
                <span key={d.label} style={{ left: `${d.left}%` }}>
                  {d.label}
                </span>
              ))}
            </div>
          </div>
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => {
              setPlaying(false);
              setTimeIndex(0);
            }}
            disabled={times.length === 0}
          >
            いま
          </button>
        </div>
        <p className="text-caption num atlas__time">
          表示中の時刻 {times[safeIndex] ? formatTimeLabel(times[safeIndex]) : "—"}
          {times.length > 0 && ` (+${safeIndex * (grid?.stepHours ?? 3)}時間)`}
        </p>
      </section>
    </main>
  );
}
