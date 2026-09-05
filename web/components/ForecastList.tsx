import type { Forecast } from "@/lib/types";
import { iconFor, labelFor } from "@/lib/weatherCode";

function formatTime(iso: string): string {
  return iso.slice(11, 16);
}

export function ForecastList({ forecast }: { forecast: Forecast }) {
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
            {day.tempMinC.toFixed(0)}° / {day.tempMaxC.toFixed(0)}°
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
            {day.windSpeedMaxMs.toFixed(1)}m/s
          </p>
          <p className="text-caption" style={{ margin: 0 }}>
            日出 {formatTime(day.sunrise)} 日没 {formatTime(day.sunset)}
          </p>
        </div>
      ))}
    </div>
  );
}
