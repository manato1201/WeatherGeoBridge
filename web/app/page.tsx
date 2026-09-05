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
    <main className="page-shell">
      <header className="app-header">
        <h1 className="app-header__title">WeatherGeoBridge</h1>
        <p className="app-header__subtitle">天気の取得・通知・地図閲覧</p>
      </header>

      <div className="dashboard-grid">
        <LocationPicker onChange={setLocation} />

        <div className="section">
          {loading && <p className="text-muted">読み込み中...</p>}
          {error && (
            <p className="text-destructive" style={{ margin: 0 }}>
              {error}
            </p>
          )}
          {!location && !loading && !error && (
            <p className="text-muted">左のパネルから地点を選択してください。</p>
          )}

          {observation && (
            <div className="section" style={{ gap: "var(--space-12)" }}>
              <p className="section__heading">現在の天気</p>
              <WeatherCard observation={observation} />
            </div>
          )}

          {forecast && (
            <div className="section" style={{ gap: "var(--space-12)" }}>
              <p className="section__heading">予報</p>
              <ForecastList forecast={forecast} />
            </div>
          )}
        </div>
      </div>

      <div className="section">
        <p className="section__heading">地図</p>
        <MapView observation={observation} />
      </div>

      <NotificationOptIn />
    </main>
  );
}
