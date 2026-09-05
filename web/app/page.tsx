"use client";

import { useEffect, useState } from "react";
import { ForecastList } from "@/components/ForecastList";
import { LocationPicker } from "@/components/LocationPicker";
import { MapView } from "@/components/MapView";
import { NotificationOptIn } from "@/components/NotificationOptIn";
import { WeatherCard } from "@/components/WeatherCard";
import type {
  Forecast,
  LocationContext,
  WeatherObservation,
} from "@/lib/types";

export default function Page() {
  const [location, setLocation] = useState<LocationContext | null>(null);
  const [observation, setObservation] = useState<WeatherObservation | null>(
    null,
  );
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!location) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([
      fetch(`/api/weather?lat=${location.lat}&lon=${location.lon}`).then((r) =>
        r.json(),
      ),
      fetch(
        `/api/weather/forecast?lat=${location.lat}&lon=${location.lon}&days=5`,
      ).then((r) => r.json()),
    ])
      .then(([weatherData, forecastData]) => {
        if (cancelled) return;
        if (weatherData.error) throw new Error(weatherData.error);
        if (forecastData.error) throw new Error(forecastData.error);
        setObservation(weatherData);
        setForecast(forecastData);
      })
      .catch((err) => {
        if (!cancelled)
          setError(
            err instanceof Error ? err.message : "天気の取得に失敗しました",
          );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [location]);

  return (
    <main
      style={{
        padding: 24,
        display: "flex",
        flexDirection: "column",
        gap: 24,
        maxWidth: 900,
      }}
    >
      <h1>WeatherGeoBridge</h1>

      <LocationPicker onChange={setLocation} />

      {loading && <p>読み込み中...</p>}
      {error && <p style={{ color: "crimson" }}>{error}</p>}

      {observation && <WeatherCard observation={observation} />}
      {forecast && <ForecastList forecast={forecast} />}

      <MapView observation={observation} />

      <NotificationOptIn />
    </main>
  );
}
