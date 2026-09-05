// Open-Meteo Forecast API クライアント + 正規化(WeatherGeoBridge_DESIGN.md Phase1をTypeScriptへ移植)。
// APIキー不要で動作する。wind_speed_unit=ms を明示指定しないとOpen-Meteoの既定値はkm/hであり、
// スキーマ上のwindSpeedMs(m/s)と単位が食い違うため、必ず指定すること。

import type {
  AirQuality,
  Forecast,
  ForecastDay,
  HourlyPoint,
  WeatherObservation,
} from "./types";

const BASE_URL = "https://api.open-meteo.com/v1/forecast";
const AIR_QUALITY_URL = "https://air-quality-api.open-meteo.com/v1/air-quality";

const CURRENT_PARAMS = [
  "temperature_2m",
  "apparent_temperature",
  "relative_humidity_2m",
  "precipitation",
  "weather_code",
  "wind_speed_10m",
  "wind_direction_10m",
  "wind_gusts_10m",
  "cloud_cover",
  "surface_pressure",
  "is_day",
].join(",");

const DAILY_PARAMS = [
  "temperature_2m_max",
  "temperature_2m_min",
  "apparent_temperature_max",
  "apparent_temperature_min",
  "precipitation_sum",
  "precipitation_probability_max",
  "weather_code",
  "sunrise",
  "sunset",
  "uv_index_max",
  "wind_speed_10m_max",
  "wind_gusts_10m_max",
].join(",");

const HOURLY_PARAMS = [
  "temperature_2m",
  "precipitation_probability",
  "weather_code",
].join(",");

export class WeatherClientError extends Error {
  // Open-Meteoが返した実際のHTTPステータス(接続失敗時はundefined)。
  // 呼び出し元(index.ts)がこれを見て、4xx(呼び出し側の入力不備)と
  // それ以外(上流障害)を区別してレスポンスコードを決められるようにする。
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "WeatherClientError";
    this.status = status;
  }
}

async function get(
  baseUrl: string,
  params: Record<string, string>,
): Promise<any> {
  const url = new URL(baseUrl);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  let res: Response;
  try {
    res = await fetch(url.toString());
  } catch (err) {
    throw new WeatherClientError(`Open-Meteoへの接続に失敗しました: ${err}`);
  }
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new WeatherClientError(
      `Open-Meteoがエラーを返しました: ${res.status} ${body}`.trim(),
      res.status,
    );
  }
  return res.json();
}

export async function fetchCurrentObservation(
  lat: number,
  lon: number,
): Promise<WeatherObservation> {
  const raw = await get(BASE_URL, {
    latitude: String(lat),
    longitude: String(lon),
    current: CURRENT_PARAMS,
    wind_speed_unit: "ms",
    timezone: "Asia/Tokyo",
  });
  const cur = raw.current;
  return {
    lat,
    lon,
    observedAt: cur.time,
    temperatureC: cur.temperature_2m,
    apparentTemperatureC: cur.apparent_temperature,
    humidityPercent: cur.relative_humidity_2m,
    precipitationMm: cur.precipitation,
    weatherCode: cur.weather_code,
    windSpeedMs: cur.wind_speed_10m,
    windDirectionDeg: cur.wind_direction_10m,
    windGustsMs: cur.wind_gusts_10m,
    cloudCoverPercent: cur.cloud_cover,
    surfacePressureHpa: cur.surface_pressure,
    isDay: cur.is_day === 1,
    source: "open-meteo",
  };
}

export async function fetchForecast(
  lat: number,
  lon: number,
  days: number,
): Promise<Forecast> {
  const clampedDays = Math.max(1, Math.min(16, days));
  const raw = await get(BASE_URL, {
    latitude: String(lat),
    longitude: String(lon),
    daily: DAILY_PARAMS,
    hourly: HOURLY_PARAMS,
    forecast_days: String(clampedDays),
    wind_speed_unit: "ms",
    timezone: "Asia/Tokyo",
  });

  const daily = raw.daily;
  const days_: ForecastDay[] = daily.time.map((date: string, i: number) => ({
    date,
    tempMaxC: daily.temperature_2m_max[i],
    tempMinC: daily.temperature_2m_min[i],
    apparentTempMaxC: daily.apparent_temperature_max[i],
    apparentTempMinC: daily.apparent_temperature_min[i],
    precipitationMm: daily.precipitation_sum[i],
    precipitationProbabilityPercent: daily.precipitation_probability_max[i],
    weatherCode: daily.weather_code[i],
    sunrise: daily.sunrise[i],
    sunset: daily.sunset[i],
    uvIndexMax: daily.uv_index_max[i],
    windSpeedMaxMs: daily.wind_speed_10m_max[i],
    windGustsMaxMs: daily.wind_gusts_10m_max[i],
  }));

  const hourly = raw.hourly;
  // Open-Meteoのhourly.timeはAsia/Tokyoのタイムゾーンオフセットなしの文字列
  // ("2026-09-05T00:00")で返る。Dateでparseすると実行環境依存でUTC/localの
  // 解釈がぶれるため、文字列比較(ISO形式は辞書順=時系列順)でJST基準の
  // 「現在時刻の属する時」以降に絞る。
  const nowJst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const nowJstFloorHour = `${nowJst.toISOString().slice(0, 13)}:00`;
  const hourlyPoints: HourlyPoint[] = hourly.time
    .map((time: string, i: number) => ({
      time,
      temperatureC: hourly.temperature_2m[i],
      precipitationProbabilityPercent: hourly.precipitation_probability[i],
      weatherCode: hourly.weather_code[i],
    }))
    // 直近24時間分に絞る
    .filter((p: HourlyPoint) => p.time >= nowJstFloorHour)
    .slice(0, 24);

  return { lat, lon, daily: days_, hourly: hourlyPoints };
}

const AIR_QUALITY_PARAMS = [
  "pm10",
  "pm2_5",
  "european_aqi",
  "us_aqi",
  "uv_index",
].join(",");

export async function fetchAirQuality(
  lat: number,
  lon: number,
): Promise<AirQuality> {
  const raw = await get(AIR_QUALITY_URL, {
    latitude: String(lat),
    longitude: String(lon),
    current: AIR_QUALITY_PARAMS,
    timezone: "Asia/Tokyo",
  });
  const cur = raw.current;
  return {
    lat,
    lon,
    observedAt: cur.time,
    pm2_5: cur.pm2_5,
    pm10: cur.pm10,
    europeanAqi: cur.european_aqi,
    usAqi: cur.us_aqi,
    uvIndex: cur.uv_index,
  };
}
