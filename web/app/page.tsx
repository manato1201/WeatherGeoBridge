"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AirQualityCard } from "@/components/AirQualityCard";
import { ForecastList } from "@/components/ForecastList";
import { HourlyStrip } from "@/components/HourlyStrip";
import { LocationPicker } from "@/components/LocationPicker";
import { MapView } from "@/components/MapView";
import { NotificationOptIn } from "@/components/NotificationOptIn";
import { CloudCoverOrb } from "@/components/telemetry/CloudCoverOrb";
import { PrecipitationCluster } from "@/components/telemetry/PrecipitationCluster";
import { PressureCompass } from "@/components/telemetry/PressureCompass";
import { ThemeToggle } from "@/components/ThemeToggle";
import { TrendChart } from "@/components/TrendChart";
import { UnitToggle } from "@/components/UnitToggle";
import { WeatherCard } from "@/components/WeatherCard";
import type {
  AirQuality,
  Forecast,
  LocationContext,
  WeatherObservation,
} from "@/lib/types";
import { useUnits } from "@/lib/UnitsContext";
import { formatSpeed } from "@/lib/units";

function locationFromUrl(): LocationContext | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const lat = Number(params.get("lat"));
  const lon = Number(params.get("lon"));
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return { lat, lon, accuracyMeters: null, source: "manual_pin" };
}

function syncLocationToUrl(location: LocationContext) {
  const params = new URLSearchParams(window.location.search);
  params.set("lat", location.lat.toFixed(4));
  params.set("lon", location.lon.toFixed(4));
  window.history.replaceState(null, "", `?${params.toString()}`);
}

export default function Page() {
  const [location, setLocation] = useState<LocationContext | null>(null);
  const [observation, setObservation] = useState<WeatherObservation | null>(
    null,
  );
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [airQuality, setAirQuality] = useState<AirQuality | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const { speedUnit } = useUnits();

  // 初回マウント時にURLの?lat=&lon=があれば復元する(共有・ブックマーク用)。
  useEffect(() => {
    const fromUrl = locationFromUrl();
    if (fromUrl) setLocation(fromUrl);
  }, []);

  const handleLocationChange = useCallback((next: LocationContext) => {
    setLocation(next);
    syncLocationToUrl(next);
  }, []);

  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!location) return;

    // AbortControllerで実際にリクエストをキャンセルする(単にstate更新を
    // 無視するだけのフラグ方式だと、地点を素早く切り替えた際に不要になった
    // Open-Meteoへのリクエストがバックグラウンドで走り続けてしまう)。
    const controller = new AbortController();
    controllerRef.current = controller;
    setLoading(true);
    setError(null);

    Promise.all([
      fetch(`/api/weather?lat=${location.lat}&lon=${location.lon}`, {
        signal: controller.signal,
      }).then((r) => r.json()),
      fetch(
        `/api/weather/forecast?lat=${location.lat}&lon=${location.lon}&days=5`,
        {
          signal: controller.signal,
        },
      ).then((r) => r.json()),
      fetch(`/api/air-quality?lat=${location.lat}&lon=${location.lon}`, {
        signal: controller.signal,
      })
        .then((r) => r.json())
        .catch(() => null),
    ])
      .then(([weatherData, forecastData, airQualityData]) => {
        if (weatherData.error) throw new Error(weatherData.error);
        if (forecastData.error) throw new Error(forecastData.error);
        setObservation(weatherData);
        setForecast(forecastData);
        setAirQuality(
          airQualityData && !airQualityData.error ? airQualityData : null,
        );
        setLastUpdated(new Date());
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(
          err instanceof Error ? err.message : "天気の取得に失敗しました",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [location, refreshTick]);

  return (
    <main className="page-shell">
      <header
        className="app-header"
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          alignItems: "flex-start",
          justifyContent: "space-between",
          display: "flex",
          gap: "var(--space-16)",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <h1 className="app-header__title">WeatherGeoBridge</h1>
          <p className="app-header__subtitle">天気の取得・通知・地図閲覧</p>
        </div>
        <div
          style={{ display: "flex", gap: "var(--space-8)", flexWrap: "wrap" }}
        >
          <UnitToggle />
          <ThemeToggle />
        </div>
      </header>

      <div className="dashboard-grid">
        <LocationPicker location={location} onChange={handleLocationChange} />

        <div className="section">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "var(--space-8)",
            }}
          >
            <div>
              {loading && (
                <p className="text-muted" style={{ margin: 0 }}>
                  読み込み中...
                </p>
              )}
              {error && (
                <p className="text-destructive" style={{ margin: 0 }}>
                  {error}
                </p>
              )}
              {!location && !loading && !error && (
                <p className="text-muted" style={{ margin: 0 }}>
                  左のパネルから地点を選択してください。
                </p>
              )}
              {lastUpdated && !loading && (
                <p className="text-caption" style={{ margin: 0 }}>
                  更新: {lastUpdated.toLocaleTimeString("ja-JP")}
                </p>
              )}
            </div>
            {location && (
              <button
                className="btn btn--outline"
                type="button"
                onClick={() => setRefreshTick((t) => t + 1)}
                disabled={loading}
              >
                更新
              </button>
            )}
          </div>

          {observation && (
            <div className="section" style={{ gap: "var(--space-12)" }}>
              <p className="section__heading">現在の天気</p>
              <WeatherCard observation={observation} />
            </div>
          )}

          {airQuality && (
            <div className="section" style={{ gap: "var(--space-12)" }}>
              <p className="section__heading">大気質</p>
              <AirQualityCard airQuality={airQuality} />
            </div>
          )}

          {forecast && (
            <div className="section" style={{ gap: "var(--space-12)" }}>
              <p className="section__heading">時間別(24時間)</p>
              <HourlyStrip forecast={forecast} />
            </div>
          )}

          {forecast && forecast.hourly.length > 0 && (
            <div className="section" style={{ gap: "var(--space-12)" }}>
              <p className="section__heading">推移(気温・降水確率)</p>
              <TrendChart hourly={forecast.hourly} />
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

      {observation && (
        <div className="section">
          <div>
            <p className="section__heading">気象テレメトリー</p>
            <p className="text-caption" style={{ margin: 0 }}>
              雨雲レーダー・天気図・気象衛星の実画像は使用していません(気象庁の非公式エンドポイントに依存するリスクを避けるため)。以下は現在の観測データに基づく独自のビジュアライゼーションです。
            </p>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "var(--space-16)",
            }}
          >
            {forecast && <PrecipitationCluster hourly={forecast.hourly} />}
            <PressureCompass
              pressureHpa={observation.surfacePressureHpa}
              windDirectionDeg={observation.windDirectionDeg}
              windSpeedLabel={formatSpeed(observation.windSpeedMs, speedUnit)}
            />
            <CloudCoverOrb
              cloudCoverPercent={observation.cloudCoverPercent}
              isDay={observation.isDay}
            />
          </div>
        </div>
      )}

      <div className="section">
        <p className="section__heading">地図(クリックで地点を選択できます)</p>
        <MapView
          observation={observation}
          onPick={(lat, lon) =>
            handleLocationChange({
              lat,
              lon,
              accuracyMeters: null,
              source: "manual_pin",
            })
          }
        />
      </div>

      <NotificationOptIn />
    </main>
  );
}
