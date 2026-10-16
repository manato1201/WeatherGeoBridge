"use client";

// 地点の詳細(UIパーツ: ドロワー02 / ボトムシート03)。PCでは右から出るドロワー、
// 狭い画面では下から出るボトムシート。非モーダルなので地図は隠さず操作できる。
// 気温の折れ線は SVG ラインドロー(Motion 13): 地点が変わるたびに描き直す。

import { useEffect, useRef } from "react";
import { CountUp } from "@/components/CountUp";
import { WeatherIcon } from "@/components/WeatherIcon";
import {
  cautionsAt,
  colorFor,
  formatTimeLabel,
  METRICS,
  valueAt,
  type AtlasMetric,
  type SeriesPoint,
} from "@/lib/atlas";

const W = 300;
const H = 120;
const LEFT = 34;
const RIGHT = W - 8;
const TEMP_TOP = 10;
const TEMP_BOTTOM = 70;
const BAR_TOP = 84;
const BAR_BOTTOM = 112;

function xFor(i: number, n: number): number {
  return n <= 1 ? LEFT : LEFT + (i / (n - 1)) * (RIGHT - LEFT);
}

export function DetailDrawer({
  name,
  romaji,
  point,
  times,
  index,
  metric,
  loading,
  onClose,
}: {
  name: string;
  romaji?: string;
  point: SeriesPoint | null;
  times: string[];
  /** この地点の系列(times)内での、スライダー時刻の添字。-1なら該当なし。 */
  index: number;
  metric: AtlasMetric;
  loading: boolean;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement | null>(null);

  // 開いた直後にフォーカスを移す(キーボード操作でも閉じられるように)。
  useEffect(() => {
    closeRef.current?.focus({ preventScroll: true });
  }, []);

  const def = METRICS[metric];
  const hasIndex = point !== null && index >= 0;
  const current = hasIndex ? valueAt(point, metric, index) : null;
  const cautions = hasIndex ? cautionsAt(point, index) : [];
  const code = hasIndex ? point.weatherCode[index] : null;

  const n = point?.temperatureC.length ?? 0;
  const temps = (point?.temperatureC ?? []).filter((v): v is number => v !== null);
  const minT = temps.length ? Math.min(...temps) - 1 : 0;
  const maxT = temps.length ? Math.max(...temps) + 1 : 1;
  const range = maxT - minT || 1;
  const yFor = (t: number) => TEMP_BOTTOM - ((t - minT) / range) * (TEMP_BOTTOM - TEMP_TOP);

  let path = "";
  if (point && temps.length > 1) {
    let pen = false;
    path = point.temperatureC
      .map((t, i) => {
        if (t === null) {
          pen = false;
          return "";
        }
        const cmd = pen ? "L" : "M";
        pen = true;
        return `${cmd} ${xFor(i, n).toFixed(1)} ${yFor(t).toFixed(1)}`;
      })
      .filter(Boolean)
      .join(" ");
  }

  return (
    <aside className="drawer" aria-label={`${name}の詳細`}>
      <span className="drawer__grab" aria-hidden="true" />
      <header className="drawer__head">
        <div className="drawer__title">
          <h2>{name}</h2>
          {romaji && <small>{romaji}</small>}
        </div>
        <button
          ref={closeRef}
          type="button"
          className="btn btn--outline drawer__close"
          onClick={onClose}
          aria-label="詳細を閉じる(Esc)"
        >
          ✕
        </button>
      </header>

      {!loading && !point ? (
        <div className="drawer__body">
          <p className="text-muted">この地点の予報を取得できませんでした。</p>
        </div>
      ) : loading || !point ? (
        <div className="drawer__body" aria-busy="true">
          <div className="skeleton skeleton--lg" />
          <div className="skeleton" />
          <div className="skeleton skeleton--chart" />
        </div>
      ) : (
        <div className="drawer__body">
          <p className="text-caption num drawer__time">
            {hasIndex && times[index] ? formatTimeLabel(times[index]) : "—"}
          </p>
          <div className="drawer__hero">
            <span
              className="drawer__swatch"
              style={{ background: colorFor(metric, current) }}
              aria-hidden="true"
            />
            <p className="drawer__value num">
              <span className="drawer__metric">{def.label}</span>
              {current === null ? (
                "—"
              ) : (
                <>
                  <CountUp value={current} fractionDigits={def.fractionDigits} />
                  <small>{def.unit}</small>
                </>
              )}
            </p>
            {code !== null && <WeatherIcon weatherCode={code} size={36} />}
          </div>

          <dl className="drawer__facts num">
            {(["temperature", "precipitation", "wind"] as const).map((m) => {
              const v = hasIndex ? valueAt(point, m, index) : null;
              return (
                <div key={m} aria-current={m === metric ? "true" : undefined}>
                  <dt>{METRICS[m].label}</dt>
                  <dd>
                    {v === null ? "—" : v.toFixed(METRICS[m].fractionDigits)}
                    <small>{METRICS[m].unit}</small>
                  </dd>
                </div>
              );
            })}
          </dl>

          {cautions.length > 0 && (
            <ul
              className="drawer__cautions"
              aria-label="予報の注意(気象庁の警報・注意報ではありません)"
            >
              {cautions.map((c) => (
                <li key={c.kind} className="badge badge--outline">
                  {c.label} · {c.detail}
                </li>
              ))}
            </ul>
          )}

          <figure className="drawer__chart">
            <figcaption className="text-caption">
              気温の推移 +{(times.length - 1) * 3}時間
              {temps.length > 0 && (
                <span className="num">
                  {" "}
                  {Math.min(...temps).toFixed(0)}〜{Math.max(...temps).toFixed(0)}℃
                </span>
              )}
            </figcaption>
            <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="気温の推移の折れ線グラフ">
              {[TEMP_TOP, (TEMP_TOP + TEMP_BOTTOM) / 2, TEMP_BOTTOM].map((y) => (
                <line
                  key={y}
                  x1={LEFT}
                  x2={RIGHT}
                  y1={y}
                  y2={y}
                  stroke="var(--color-hairline)"
                  strokeWidth={1}
                />
              ))}
              {point.precipitationProbabilityPercent.map((p, i) => {
                const h = ((p ?? 0) / 100) * (BAR_BOTTOM - BAR_TOP);
                return (
                  <rect
                    key={i}
                    x={xFor(i, n) - 3}
                    y={BAR_BOTTOM - h}
                    width={6}
                    height={Math.max(h, 1)}
                    rx={2}
                    fill="var(--color-mid-gray)"
                    opacity={0.7}
                  />
                );
              })}
              {path && (
                <path
                  key={`${name}:${path}`}
                  className="draw-line"
                  d={path}
                  pathLength={1}
                  fill="none"
                  stroke="var(--color-ink)"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
              {hasIndex && point.temperatureC[index] !== null && (
                <>
                  <line
                    x1={xFor(index, n)}
                    x2={xFor(index, n)}
                    y1={TEMP_TOP}
                    y2={BAR_BOTTOM}
                    stroke="var(--color-mid-gray)"
                    strokeDasharray="2,2"
                  />
                  <circle
                    cx={xFor(index, n)}
                    cy={yFor(point.temperatureC[index] as number)}
                    r={4}
                    fill="var(--color-ink)"
                    stroke="var(--color-paper)"
                    strokeWidth={2}
                  />
                </>
              )}
              {temps.length > 0 && (
                <>
                  <text x={2} y={TEMP_TOP + 4} fontSize={9} fill="var(--color-mid-gray)">
                    {maxT.toFixed(0)}℃
                  </text>
                  <text x={2} y={TEMP_BOTTOM} fontSize={9} fill="var(--color-mid-gray)">
                    {minT.toFixed(0)}℃
                  </text>
                </>
              )}
              <text x={2} y={BAR_TOP + 4} fontSize={9} fill="var(--color-mid-gray)">
                降水
              </text>
              <text x={2} y={BAR_BOTTOM} fontSize={9} fill="var(--color-mid-gray)">
                0%
              </text>
            </svg>
          </figure>
        </div>
      )}
    </aside>
  );
}
