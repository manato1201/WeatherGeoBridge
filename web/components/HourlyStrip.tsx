import type { Forecast } from "@/lib/types";
import { iconFor } from "@/lib/weatherCode";

function formatHour(iso: string): string {
  return `${iso.slice(11, 13)}時`;
}

export function HourlyStrip({ forecast }: { forecast: Forecast }) {
  if (forecast.hourly.length === 0) return null;

  return (
    <div className="card" style={{ overflowX: "auto" }}>
      <div
        style={{
          display: "flex",
          gap: "var(--space-16)",
          width: "max-content",
        }}
      >
        {forecast.hourly.map((point) => (
          <div key={point.time} style={{ textAlign: "center", minWidth: 48 }}>
            <p className="text-caption" style={{ margin: 0 }}>
              {formatHour(point.time)}
            </p>
            <div style={{ fontSize: 20, margin: "4px 0" }} aria-hidden="true">
              {iconFor(point.weatherCode)}
            </div>
            <p
              style={{
                margin: 0,
                fontSize: "var(--text-body)",
                fontWeight: 500,
              }}
            >
              {point.temperatureC.toFixed(0)}°
            </p>
            <p className="text-caption" style={{ margin: 0 }}>
              {point.precipitationProbabilityPercent}%
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
