import type { Forecast } from "@/lib/types";
import { iconFor } from "@/lib/weatherCode";

export function ForecastList({ forecast }: { forecast: Forecast }) {
  return (
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
      {forecast.daily.map((day) => (
        <div
          key={day.date}
          style={{
            border: "1px solid #ddd",
            borderRadius: 8,
            padding: 12,
            minWidth: 100,
          }}
        >
          <p style={{ margin: 0, fontWeight: "bold" }}>{day.date}</p>
          <div style={{ fontSize: 24 }}>{iconFor(day.weatherCode)}</div>
          <p style={{ margin: 0 }}>
            {day.tempMinC.toFixed(0)}℃ / {day.tempMaxC.toFixed(0)}℃
          </p>
          <p style={{ margin: 0, fontSize: 12, color: "#666" }}>
            {day.precipitationMm.toFixed(1)}mm
          </p>
        </div>
      ))}
    </div>
  );
}
