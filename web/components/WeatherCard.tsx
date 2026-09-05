import type { WeatherObservation } from "@/lib/types";
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
        <p className="stat-block__value">{observation.temperatureC.toFixed(1)}℃</p>
        <p className="stat-block__meta" style={{ margin: 0 }}>
          体感 {observation.apparentTemperatureC.toFixed(1)}℃
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-12)" }}>
        <Metric label="降水量" value={`${observation.precipitationMm.toFixed(1)}mm`} />
        <Metric label="湿度" value={`${observation.humidityPercent}%`} />
        <Metric
          label="風"
          value={`${observation.windSpeedMs.toFixed(1)}m/s ${compassLabel(observation.windDirectionDeg)}`}
        />
        <Metric label="突風" value={`${observation.windGustsMs.toFixed(1)}m/s`} />
        <Metric label="雲量" value={`${observation.cloudCoverPercent}%`} />
        <Metric label="気圧" value={`${observation.surfacePressureHpa.toFixed(0)}hPa`} />
      </div>

      <p className="text-caption" style={{ margin: 0 }}>
        観測時刻: {observation.observedAt} / 出典: {observation.source}
      </p>
    </div>
  );
}
