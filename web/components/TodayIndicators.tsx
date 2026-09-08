"use client";

import { RadialProgress } from "@/components/RadialProgress";
import type { ForecastDay } from "@/lib/types";

const MAX_UV_INDEX = 11; // 気象庁のUV指数スケール(「非常に強い」以上の上限目安)

export function TodayIndicators({ today }: { today: ForecastDay }) {
  const uvPercent = Math.min(100, (today.uvIndexMax / MAX_UV_INDEX) * 100);

  return (
    <div
      className="card"
      style={{ display: "flex", gap: "var(--space-24)", justifyContent: "center" }}
    >
      <RadialProgress
        percent={today.precipitationProbabilityPercent}
        label="今日の降水確率"
        valueLabel={`${today.precipitationProbabilityPercent}%`}
      />
      <RadialProgress
        percent={uvPercent}
        label="UV指数"
        valueLabel={today.uvIndexMax.toFixed(1)}
      />
    </div>
  );
}
