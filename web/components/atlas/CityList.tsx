"use client";

// 左パネル(IMPROVEMENT_DESIGN_2026-10.md 4.1): 検索 + 並べ替えチップ + 地点一覧。
// 一覧の行は「記号 + 名前 + 副題 + 数値(右揃え)」に統一している。

import { useMemo, useState } from "react";
import {
  colorFor,
  distanceKm,
  formatValue,
  METRICS,
  valueAt,
  type AtlasMetric,
  type SeriesPoint,
} from "@/lib/atlas";

export interface CityRow {
  id: string;
  name: string;
  romaji?: string;
  lat: number;
  lon: number;
  favorite: boolean;
}

interface GeocodeResult {
  name: string;
  admin1: string | null;
  country: string | null;
  lat: number;
  lon: number;
}

type Chip = "fav" | "near" | "rain";

const CHIPS: { id: Chip; label: string }[] = [
  { id: "fav", label: "お気に入り" },
  { id: "near", label: "近い順" },
  { id: "rain", label: "降水が多い順" },
];

const FALLBACK_CENTER = { lat: 35.6812, lon: 139.7671 };

export function CityList({
  rows,
  series,
  timeIndex,
  metric,
  selected,
  onSelect,
  onToggleFavorite,
}: {
  rows: CityRow[];
  /** rowsと同じ並びの予報系列(未取得ならnull)。 */
  series: SeriesPoint[] | null;
  timeIndex: number;
  metric: AtlasMetric;
  selected: { lat: number; lon: number } | null;
  onSelect: (location: { lat: number; lon: number }) => void;
  onToggleFavorite: (row: CityRow) => void;
}) {
  const [query, setQuery] = useState("");
  const [chip, setChip] = useState<Chip | null>(null);
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<GeocodeResult[] | null>(null);

  const entries = useMemo(() => {
    const base = rows.map((row, i) => ({ row, point: series?.[i] ?? null }));
    const q = query.trim().toLowerCase();
    let list = q
      ? base.filter(
          ({ row }) =>
            row.name.toLowerCase().includes(q) ||
            row.romaji?.toLowerCase().includes(q),
        )
      : base;
    if (chip === "fav") list = list.filter(({ row }) => row.favorite);
    if (chip === "near") {
      const c = selected ?? FALLBACK_CENTER;
      list = [...list].sort(
        (a, b) =>
          distanceKm(c.lat, c.lon, a.row.lat, a.row.lon) -
          distanceKm(c.lat, c.lon, b.row.lat, b.row.lon),
      );
    }
    if (chip === "rain") {
      const rain = (p: SeriesPoint | null) =>
        p ? (valueAt(p, "precipitation", timeIndex) ?? -1) : -1;
      list = [...list].sort((a, b) => rain(b.point) - rain(a.point));
    }
    return list;
  }, [rows, series, query, chip, selected, timeIndex]);

  async function search() {
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data.results ?? []);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }

  const isSelected = (row: CityRow) =>
    selected !== null &&
    Math.abs(selected.lat - row.lat) < 0.01 &&
    Math.abs(selected.lon - row.lon) < 0.01;

  return (
    <div className="atlas-list">
      <form
        className="atlas-list__search"
        onSubmit={(e) => {
          e.preventDefault();
          void search();
        }}
      >
        <input
          className="input"
          type="search"
          placeholder="地点・地域を探す"
          aria-label="地点・地域を探す"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setResults(null);
          }}
        />
        <button
          className="btn btn--outline"
          type="submit"
          disabled={searching || !query.trim()}
        >
          探す
        </button>
      </form>

      <div
        className="atlas-list__chips"
        role="group"
        aria-label="並べ替え・絞り込み"
      >
        {CHIPS.map((c) => (
          <button
            key={c.id}
            type="button"
            className="chip"
            aria-pressed={chip === c.id}
            onClick={() => setChip(chip === c.id ? null : c.id)}
          >
            {c.label}
          </button>
        ))}
      </div>

      {results !== null && (
        <div className="atlas-list__results">
          <p className="field__label">検索結果(ローマ字・英語で検索できます)</p>
          {results.length === 0 ? (
            <p className="text-muted">見つかりませんでした。</p>
          ) : (
            <ul className="atlas-list__rows">
              {results.map((r) => (
                <li key={`${r.lat},${r.lon}`}>
                  <button
                    type="button"
                    className="atlas-row"
                    onClick={() => {
                      onSelect({ lat: r.lat, lon: r.lon });
                      setResults(null);
                    }}
                  >
                    <span
                      className="atlas-row__dot atlas-row__dot--empty"
                      aria-hidden="true"
                    />
                    <span className="atlas-row__name">
                      <span>{r.name}</span>
                      <small>
                        {[r.admin1, r.country].filter(Boolean).join(" / ")}
                      </small>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <ul className="atlas-list__rows" aria-label="地点一覧">
        {entries.map(({ row, point }) => {
          const value = point ? valueAt(point, metric, timeIndex) : null;
          const others = (["temperature", "precipitation", "wind"] as const)
            .filter((m) => m !== metric)
            .map((m) => {
              const v = point ? valueAt(point, m, timeIndex) : null;
              return `${METRICS[m].label} ${formatValue(m, v)}`;
            })
            .join(" · ");
          return (
            <li key={row.id} className="atlas-row-wrap">
              <button
                type="button"
                className="atlas-row"
                aria-current={isSelected(row) ? "true" : undefined}
                onClick={() => onSelect({ lat: row.lat, lon: row.lon })}
              >
                <span
                  className="atlas-row__dot"
                  style={{ background: colorFor(metric, value) }}
                  aria-hidden="true"
                />
                <span className="atlas-row__name">
                  <span>{row.name}</span>
                  {row.romaji && <small>{row.romaji}</small>}
                </span>
                <span className="atlas-row__values">
                  <span className="num atlas-row__primary">
                    {formatValue(metric, value)}
                  </span>
                  <span className="num atlas-row__secondary">{others}</span>
                </span>
              </button>
              <button
                type="button"
                className="atlas-row__star"
                aria-pressed={row.favorite}
                aria-label={`${row.name}をお気に入り${row.favorite ? "から外す" : "に追加"}`}
                onClick={() => onToggleFavorite(row)}
              >
                {row.favorite ? "★" : "☆"}
              </button>
            </li>
          );
        })}
        {entries.length === 0 && (
          <li className="text-muted atlas-list__empty">
            {chip === "fav"
              ? "お気に入りはまだありません。各行の☆で追加できます。"
              : "該当する地点がありません。"}
          </li>
        )}
      </ul>
    </div>
  );
}
