// core/models.py と1:1対応するTS型(WeatherGeoBridge_DESIGN.md Phase0)。

export interface WeatherObservation {
  lat: number;
  lon: number;
  observedAt: string; // ISO8601
  temperatureC: number;
  precipitationMm: number;
  weatherCode: number; // WMO weather interpretation code
  windSpeedMs: number;
  source: "open-meteo";
}

export interface ForecastDay {
  date: string;
  tempMaxC: number;
  tempMinC: number;
  precipitationMm: number;
  weatherCode: number;
}

export interface Forecast {
  lat: number;
  lon: number;
  daily: ForecastDay[];
}

export type LocationSource =
  "browser_gps" | "manual_pin" | "game_avatar_position";

export interface LocationContext {
  lat: number;
  lon: number;
  accuracyMeters: number | null;
  source: LocationSource;
}
