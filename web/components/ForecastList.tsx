import type { Forecast } from "@/lib/types";
import { iconFor } from "@/lib/weatherCode";

export function ForecastList({ forecast }: { forecast: Forecast }) {
  return (
    <div className="forecast-row">
      {forecast.daily.map((day) => (
        <div key={day.date} className="card card--nested" style={{ minWidth: 108 }}>
          <p className="text-caption" style={{ margin: 0, fontWeight: 500, color: "var(--color-ink)" }}>
            {day.date}
          </p>
          <div style={{ fontSize: 22, margin: "4px 0" }} aria-hidden="true">
            {iconFor(day.weatherCode)}
          </div>
          <p style={{ margin: 0, fontWeight: 500 }}>
            {day.tempMinC.toFixed(0)}° / {day.tempMaxC.toFixed(0)}°
          </p>
          <p className="text-caption" style={{ margin: 0 }}>
            降水 {day.precipitationMm.toFixed(1)}mm
          </p>
        </div>
      ))}
    </div>
  );
}
