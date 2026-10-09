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

// 「過去との比較」用。Open-MeteoのHistorical/Archive API(ERA5再解析)は
// 直近数日分のデータ反映に数日のラグがあるため使わず、通常のForecast APIの
// past_daysパラメータ(自社の予報モデルの実測混じりデータで、ラグがほぼ無い)
// から取得する。
export interface HistoricalComparison {
  yesterday: HistoricalPoint | null;
  lastWeek: HistoricalPoint | null;
}

// Web Push通知の条件(ユーザーがNotificationOptInで設定する)。
// 未指定時は既定値(降水通知あり・気温急変±5℃)で動作する。
export interface NotificationPreferences {
  notifyPrecipitation: boolean;
  temperatureSwingThresholdC: number;
}

export interface Env {
  WEATHER_CACHE: KVNamespace;
  PUSH_SUBSCRIPTIONS: KVNamespace;
  WEATHERGEOBRIDGE_API_KEY: string;
  VAPID_PUBLIC_KEY: string;
  VAPID_PRIVATE_KEY: string;
  VAPID_SUBJECT: string;
  // ブラウザからのCORSを許可するオリジン(カンマ区切り)。未設定なら全拒否。
  ALLOWED_ORIGINS?: string;
}

// 地図アトラス用: 複数地点の「いま〜+72h(3時間刻み)」の予報系列。
// 全地点で times の長さと各配列の長さが一致する(欠測は null)。
export interface SeriesPoint {
  lat: number;
  lon: number;
  temperatureC: (number | null)[];
  precipitationProbabilityPercent: (number | null)[];
  precipitationMm: (number | null)[];
  windSpeedMs: (number | null)[];
  weatherCode: (number | null)[];
}

export interface SeriesSet {
  /** 取得時刻(UTCのISO8601)。画面下の注記「取得 ○時○分」の根拠。 */
  fetchedAt: string;
  stepHours: number;
  /** Asia/Tokyoのローカル時刻文字列("2026-10-09T15:00")。 */
  times: string[];
  points: SeriesPoint[];
}

export interface GridMeta {
  n: number;
  /** 1セルの辺の長さ(度)。 */
  step: number;
  centerLat: number;
  centerLon: number;
}

export interface GridSeriesSet extends SeriesSet {
  grid: GridMeta;
}
