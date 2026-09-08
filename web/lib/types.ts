// worker/src/types.ts と1:1対応するTS型(WeatherGeoBridge_DESIGN.md Phase0を拡張)。

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

export interface AirQuality {
  lat: number;
  lon: number;
  observedAt: string;
  pm2_5: number;
  pm10: number;
  europeanAqi: number;
  usAqi: number;
  uvIndex: number;
}

export interface HistoricalPoint {
  time: string;
  temperatureC: number;
}

export interface HistoricalComparison {
  yesterday: HistoricalPoint | null;
  lastWeek: HistoricalPoint | null;
}

export type LocationSource =
  "browser_gps" | "manual_pin" | "game_avatar_position";

export interface LocationContext {
  lat: number;
  lon: number;
  accuracyMeters: number | null;
  source: LocationSource;
}
