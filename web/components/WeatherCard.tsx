import type { WeatherObservation } from "@/lib/types";
import { iconFor } from "@/lib/weatherCode";

export function WeatherCard({
  observation,
}: {
  observation: WeatherObservation;
}) {
  return (
    <div
      style={{
        border: "1px solid #ccc",
        borderRadius: 8,
        padding: 16,
        maxWidth: 320,
      }}
    >
      <div style={{ fontSize: 40 }}>{iconFor(observation.weatherCode)}</div>
      <p style={{ fontSize: 28, margin: "4px 0" }}>
        {observation.temperatureC.toFixed(1)}℃
      </p>
      <p style={{ margin: 0 }}>
        降水量: {observation.precipitationMm.toFixed(1)}mm
      </p>
      <p style={{ margin: 0 }}>風速: {observation.windSpeedMs.toFixed(1)}m/s</p>
      <p style={{ margin: "8px 0 0", fontSize: 12, color: "#666" }}>
        観測時刻: {observation.observedAt}(出典: {observation.source})
      </p>
    </div>
  );
}
