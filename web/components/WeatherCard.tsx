"use client";

import type { WeatherObservation } from "@/lib/types";
import { useUnits } from "@/lib/UnitsContext";
import { formatSpeed, formatTemp } from "@/lib/units";
import { useCountUp } from "@/lib/useCountUp";
import { compassLabel, iconFor, labelFor } from "@/lib/weatherCode";

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="stat-block__label">{label}</p>
      <p className="stat-block__meta">{value}</p>
    </div>
  );
}

export function WeatherCard({ observation }: { observation: WeatherObservation }) {
  const { tempUnit, speedUnit } = useUnits();
  const animatedTemp = useCountUp(observation.temperatureC, 700);

  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", gap: "var(--space-12)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span className="badge badge--soft">
          {labelFor(observation.weatherCode)}
          {observation.isDay ? "" : "(夜)"}
        </span>
        <span style={{ fontSize: 32 }} aria-hidden="true">
          {iconFor(observation.weatherCode)}
        </span>
      </div>

      <div>
        <p className="stat-block__label">気温</p>
        <p className="stat-block__value">{formatTemp(animatedTemp, tempUnit)}</p>
        <p className="stat-block__meta" style={{ margin: 0 }}>
          体感 {formatTemp(observation.apparentTemperatureC, tempUnit)}
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-12)" }}>
        <Metric label="降水量" value={`${observation.precipitationMm.toFixed(1)}mm`} />
        <Metric label="湿度" value={`${observation.humidityPercent}%`} />
        <Metric
          label="風"
          value={`${formatSpeed(observation.windSpeedMs, speedUnit)} ${compassLabel(observation.windDirectionDeg)}`}
        />
        <Metric label="突風" value={formatSpeed(observation.windGustsMs, speedUnit)} />
        <Metric label="雲量" value={`${observation.cloudCoverPercent}%`} />
        <Metric label="気圧" value={`${observation.surfacePressureHpa.toFixed(0)}hPa`} />
      </div>

      <p className="text-caption" style={{ margin: 0 }}>
        観測時刻: {observation.observedAt} / 出典: {observation.source}
      </p>
    </div>
  );
}
