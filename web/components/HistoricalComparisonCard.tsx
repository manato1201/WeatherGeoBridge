"use client";

import type { HistoricalComparison, HistoricalPoint } from "@/lib/types";
import { formatTemp } from "@/lib/units";
import { useUnits } from "@/lib/UnitsContext";

function formatHour(iso: string): string {
  return `${iso.slice(11, 13)}時`;
}

function Row({
  label,
  point,
  currentTemperatureC,
  tempUnit,
}: {
  label: string;
  point: HistoricalPoint | null;
  currentTemperatureC: number;
  tempUnit: "C" | "F";
}) {
  if (!point) {
    return (
      <div>
        <p className="stat-block__label">{label}</p>
        <p className="stat-block__meta">データなし</p>
      </div>
    );
  }

  const deltaC = currentTemperatureC - point.temperatureC;
  // 色ではなく矢印+テキストで方向を示す(モノクロームデザインの方針)。
  const arrow = deltaC > 0.05 ? "↑" : deltaC < -0.05 ? "↓" : "→";
  const deltaLabel =
    Math.abs(deltaC) < 0.05
      ? "ほぼ同じ"
      : `${arrow} ${Math.abs(deltaC).toFixed(1)}℃${deltaC > 0 ? "高い" : "低い"}`;

  return (
    <div>
      <p className="stat-block__label">
        {label}({formatHour(point.time)})
      </p>
      <p className="stat-block__value" style={{ fontSize: "var(--text-heading-sm)" }}>
        {formatTemp(point.temperatureC, tempUnit)}
      </p>
      <p className="stat-block__meta">今と比べて{deltaLabel}</p>
    </div>
  );
}

export function HistoricalComparisonCard({
  comparison,
  currentTemperatureC,
}: {
  comparison: HistoricalComparison;
  currentTemperatureC: number;
}) {
  // useUnits()はフックなので、早期returnより前に必ず呼ぶ(Rules of Hooks)。
  const { tempUnit } = useUnits();

  if (!comparison.yesterday && !comparison.lastWeek) return null;

  return (
    <div className="card">
      <p className="stat-block__label" style={{ marginBottom: "var(--space-12)" }}>
        過去との比較
      </p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: "var(--space-16)",
        }}
      >
        <Row
          label="昨日の同時刻"
          point={comparison.yesterday}
          currentTemperatureC={currentTemperatureC}
          tempUnit={tempUnit}
        />
        <Row
          label="先週の同時刻"
          point={comparison.lastWeek}
          currentTemperatureC={currentTemperatureC}
          tempUnit={tempUnit}
        />
      </div>
    </div>
  );
}
