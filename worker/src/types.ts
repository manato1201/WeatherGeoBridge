// WeatherGeoBridge Worker — 概念モデル(WeatherGeoBridge_DESIGN.md Phase0を拡張)

export interface WeatherObservation {
  lat: number;
  lon: number;
  observedAt: string; // ISO8601
  temperatureC: number;
  apparentTemperatureC: number;
  humidityPercent: number;
  precipitationMm: number;
  weatherCode: number; // WMO weather interpretation code
  windSpeedMs: number;
  windDirectionDeg: number;
  windGustsMs: number;
  cloudCoverPercent: number;
  surfacePressureHpa: number;
  isDay: boolean;
  source: "open-meteo";
}

export interface ForecastDay {
  date: string;
  tempMaxC: number;
  tempMinC: number;
  apparentTempMaxC: number;
  apparentTempMinC: number;
  precipitationMm: number;
  precipitationProbabilityPercent: number;
  weatherCode: number;
  sunrise: string;
  sunset: string;
  uvIndexMax: number;
  windSpeedMaxMs: number;
  windGustsMaxMs: number;
}

export interface HourlyPoint {
  time: string;
  temperatureC: number;
  precipitationProbabilityPercent: number;
  weatherCode: number;
}

export interface Forecast {
  lat: number;
  lon: number;
  daily: ForecastDay[];
  hourly: HourlyPoint[];
}

export interface Env {
  WEATHER_CACHE: KVNamespace;
  PUSH_SUBSCRIPTIONS: KVNamespace;
  WEATHERGEOBRIDGE_API_KEY: string;
  VAPID_PUBLIC_KEY: string;
  VAPID_PRIVATE_KEY: string;
  VAPID_SUBJECT: string;
}
