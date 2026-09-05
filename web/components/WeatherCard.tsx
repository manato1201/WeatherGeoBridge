import type { WeatherObservation } from "@/lib/types";
import { categorize, iconFor } from "@/lib/weatherCode";

export function WeatherCard({ observation }: { observation: WeatherObservation }) {
  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", gap: "var(--space-12)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span className="badge badge--soft">{categorize(observation.weatherCode)}</span>
        <span style={{ fontSize: 32 }} aria-hidden="true">
          {iconFor(observation.weatherCode)}
        </span>
      </div>

      <div>
        <p className="stat-block__label">気温</p>
        <p className="stat-block__value">{observation.temperatureC.toFixed(1)}℃</p>
      </div>

      <div style={{ display: "flex", gap: "var(--space-16)" }}>
        <div>
          <p className="stat-block__label">降水量</p>
          <p className="stat-block__meta">{observation.precipitationMm.toFixed(1)}mm</p>
        </div>
        <div>
          <p className="stat-block__label">風速</p>
          <p className="stat-block__meta">{observation.windSpeedMs.toFixed(1)}m/s</p>
        </div>
      </div>

      <p className="text-caption" style={{ margin: 0 }}>
        観測時刻: {observation.observedAt} / 出典: {observation.source}
      </p>
    </div>
  );
}
