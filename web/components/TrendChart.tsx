"use client";

import { useMemo, useState } from "react";
import type { HourlyPoint } from "@/lib/types";
import { useUnits } from "@/lib/UnitsContext";
import { formatTemp } from "@/lib/units";

// 気温(折れ線)と降水確率(棒)は単位が異なるため、2軸チャートにはせず、
// 同じ時間軸を共有する2つの単軸チャート(スモールマルチプル)として並べる。

const WIDTH = 600;
const HEIGHT = 230;
const PLOT_LEFT = 36;
const PLOT_RIGHT = WIDTH - 12;
const TEMP_TOP = 12;
const TEMP_BOTTOM = 96;
const BAR_TOP = 128;
const BAR_BOTTOM = 188;
const AXIS_LABEL_Y = 208;

function formatHour(iso: string): string {
  return `${iso.slice(11, 13)}時`;
}

export function TrendChart({ hourly }: { hourly: HourlyPoint[] }) {
  const { tempUnit } = useUnits();
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const points = hourly.slice(0, 24);
  const n = points.length;

  const xFor = (i: number) =>
    n <= 1 ? PLOT_LEFT : PLOT_LEFT + (i / (n - 1)) * (PLOT_RIGHT - PLOT_LEFT);

  const { minTemp, maxTemp, tempPath, tempYFor } = useMemo(() => {
    if (n === 0) {
      return {
        minTemp: 0,
        maxTemp: 0,
        tempPath: "",
        tempYFor: () => TEMP_BOTTOM,
      };
    }
    const temps = points.map((p) => p.temperatureC);
    const min = Math.min(...temps) - 1;
    const max = Math.max(...temps) + 1;
    const range = max - min || 1;
    const yFor = (t: number) =>
      TEMP_BOTTOM - ((t - min) / range) * (TEMP_BOTTOM - TEMP_TOP);
    const path = points
      .map(
        (p, i) => `${i === 0 ? "M" : "L"} ${xFor(i)} ${yFor(p.temperatureC)}`,
      )
      .join(" ");
    return { minTemp: min, maxTemp: max, tempPath: path, tempYFor: yFor };
  }, [points, n]);

  if (n === 0) return null;

  const barWidth = Math.min(24, ((PLOT_RIGHT - PLOT_LEFT) / n) * 0.6);
  const hovered = hoverIndex !== null ? points[hoverIndex] : null;

  function handleMove(e: React.MouseEvent<SVGSVGElement>) {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * WIDTH;
    const ratio = (relX - PLOT_LEFT) / (PLOT_RIGHT - PLOT_LEFT);
    const idx = Math.round(ratio * (n - 1));
    setHoverIndex(Math.max(0, Math.min(n - 1, idx)));
  }

  return (
    <div className="card" style={{ position: "relative" }}>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        style={{ width: "100%", height: "auto", display: "block" }}
        onMouseMove={handleMove}
        onMouseLeave={() => setHoverIndex(null)}
      >
        {/* 気温チャート: hairlineグリッド */}
        {[TEMP_TOP, (TEMP_TOP + TEMP_BOTTOM) / 2, TEMP_BOTTOM].map((y, i) => (
          <line
            key={i}
            x1={PLOT_LEFT}
            x2={PLOT_RIGHT}
            y1={y}
            y2={y}
            stroke="var(--color-hairline)"
            strokeWidth={1}
          />
        ))}
        <text x={4} y={TEMP_TOP + 4} fontSize={10} fill="var(--color-mid-gray)">
          {formatTemp(maxTemp, tempUnit)}
        </text>
        <text x={4} y={TEMP_BOTTOM} fontSize={10} fill="var(--color-mid-gray)">
          {formatTemp(minTemp, tempUnit)}
        </text>

        <path
          d={tempPath}
          fill="none"
          stroke="var(--color-ink)"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* 降水確率チャート: 0-100%固定、24px上限・角丸のバー */}
        <line
          x1={PLOT_LEFT}
          x2={PLOT_RIGHT}
          y1={BAR_BOTTOM}
          y2={BAR_BOTTOM}
          stroke="var(--color-hairline)"
          strokeWidth={1}
        />
        <text x={4} y={BAR_TOP + 4} fontSize={10} fill="var(--color-mid-gray)">
          100%
        </text>
        <text x={4} y={BAR_BOTTOM} fontSize={10} fill="var(--color-mid-gray)">
          0%
        </text>
        {points.map((p, i) => {
          const barHeight =
            (p.precipitationProbabilityPercent / 100) * (BAR_BOTTOM - BAR_TOP);
          return (
            <rect
              key={i}
              x={xFor(i) - barWidth / 2}
              y={BAR_BOTTOM - barHeight}
              width={barWidth}
              height={Math.max(barHeight, 1)}
              rx={4}
              fill="var(--color-mid-gray)"
              opacity={hoverIndex === i ? 1 : 0.7}
            />
          );
        })}

        {/* x軸(時刻)ラベルは間引いて表示 */}
        {points.map((p, i) =>
          i % Math.ceil(n / 6) === 0 ? (
            <text
              key={i}
              x={xFor(i)}
              y={AXIS_LABEL_Y}
              fontSize={10}
              textAnchor="middle"
              fill="var(--color-mid-gray)"
            >
              {formatHour(p.time)}
            </text>
          ) : null,
        )}

        {/* ホバー時のクロスヘア(2チャート共通) */}
        {hoverIndex !== null && (
          <>
            <line
              x1={xFor(hoverIndex)}
              x2={xFor(hoverIndex)}
              y1={TEMP_TOP}
              y2={BAR_BOTTOM}
              stroke="var(--color-mid-gray)"
              strokeWidth={1}
              strokeDasharray="2,2"
            />
            <circle
              cx={xFor(hoverIndex)}
              cy={tempYFor(points[hoverIndex].temperatureC)}
              r={4}
              fill="var(--color-ink)"
              stroke="var(--color-paper)"
              strokeWidth={2}
            />
          </>
        )}
      </svg>

      {hovered && (
        <div
          className="badge badge--solid"
          style={{
            position: "absolute",
            top: "var(--space-8)",
            right: "var(--space-8)",
          }}
        >
          {formatHour(hovered.time)}:{" "}
          {formatTemp(hovered.temperatureC, tempUnit)} / 降水
          {hovered.precipitationProbabilityPercent}%
        </div>
      )}
    </div>
  );
}
