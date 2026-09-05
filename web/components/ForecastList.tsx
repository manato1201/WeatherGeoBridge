"use client";

import type { Forecast } from "@/lib/types";
import { useUnits } from "@/lib/UnitsContext";
import { formatSpeed, formatTempInt } from "@/lib/units";
import { iconFor, labelFor } from "@/lib/weatherCode";

function formatTime(iso: string): string {
  return iso.slice(11, 16);
}

export function ForecastList({ forecast }: { forecast: Forecast }) {
  const { tempUnit, speedUnit } = useUnits();

  return (
    <div className="forecast-row">
      {forecast.daily.map((day) => (
        <div
          key={day.date}
          className="card card--nested"
          style={{ minWidth: 148 }}
        >
          <p
            className="text-caption"
            style={{ margin: 0, fontWeight: 500, color: "var(--color-ink)" }}
          >
            {day.date}
          </p>
          <div style={{ fontSize: 22, margin: "4px 0" }} aria-hidden="true">
            {iconFor(day.weatherCode)}
          </div>
          <p style={{ margin: 0, fontWeight: 500 }}>
            {formatTempInt(day.tempMinC, tempUnit)} /{" "}
            {formatTempInt(day.tempMaxC, tempUnit)}
          </p>
          <p className="text-caption" style={{ margin: 0 }}>
            {labelFor(day.weatherCode)}
          </p>
          <p className="text-caption" style={{ margin: 0 }}>
            降水確率 {day.precipitationProbabilityPercent}%(
            {day.precipitationMm.toFixed(1)}mm)
          </p>
          <p className="text-caption" style={{ margin: 0 }}>
            UV指数 {day.uvIndexMax.toFixed(1)} / 最大風速{" "}
            {formatSpeed(day.windSpeedMaxMs, speedUnit)}
          </p>
          <p className="text-caption" style={{ margin: 0 }}>
            日出 {formatTime(day.sunrise)} 日没 {formatTime(day.sunset)}
          </p>
        </div>
      ))}
    </div>
  );
}
