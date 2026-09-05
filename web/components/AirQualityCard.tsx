"use client";

import type { AirQuality } from "@/lib/types";
import { europeanAqiLabel } from "@/lib/airQuality";
import { useCountUp } from "@/lib/useCountUp";

export function AirQualityCard({ airQuality }: { airQuality: AirQuality }) {
  const animatedAqi = useCountUp(airQuality.europeanAqi, 700);

  return (
    <div
      className="card"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-12)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <p className="stat-block__label" style={{ margin: 0 }}>
          大気質(European AQI)
        </p>
        <span className="badge badge--soft">
          {europeanAqiLabel(airQuality.europeanAqi)}
        </span>
      </div>
      <p className="stat-block__value" style={{ margin: 0 }}>
        {Math.round(animatedAqi)}
      </p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "var(--space-12)",
        }}
      >
        <div>
          <p className="stat-block__label">PM2.5</p>
          <p className="stat-block__meta">{airQuality.pm2_5.toFixed(1)}µg/m³</p>
        </div>
        <div>
          <p className="stat-block__label">PM10</p>
          <p className="stat-block__meta">{airQuality.pm10.toFixed(1)}µg/m³</p>
        </div>
        <div>
          <p className="stat-block__label">US AQI</p>
          <p className="stat-block__meta">{airQuality.usAqi}</p>
        </div>
        <div>
          <p className="stat-block__label">UV指数</p>
          <p className="stat-block__meta">{airQuality.uvIndex.toFixed(1)}</p>
        </div>
      </div>
    </div>
  );
}
