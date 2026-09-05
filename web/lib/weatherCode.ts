// WMO weather_code の簡易カテゴリ分類・日本語ラベル。
// カテゴリ分類は WeatherGeoBridge_DESIGN.md Phase6 の MapToCategory 設計をUI表示用途にも流用する。

export type WeatherCategory = "Clear" | "Cloudy" | "Rain" | "Snow" | "Storm" | "Unknown";

export function categorize(weatherCode: number): WeatherCategory {
  if (weatherCode >= 0 && weatherCode <= 1) return "Clear";
  if (weatherCode >= 2 && weatherCode <= 3) return "Cloudy";
  if (weatherCode >= 45 && weatherCode <= 67) return "Rain";
  if (weatherCode >= 71 && weatherCode <= 86) return "Snow";
  if (weatherCode >= 95 && weatherCode <= 99) return "Storm";
  return "Unknown";
}

const ICONS: Record<WeatherCategory, string> = {
  Clear: "☀️",
  Cloudy: "☁️",
  Rain: "🌧️",
  Snow: "❄️",
  Storm: "⛈️",
  Unknown: "❓",
};

export function iconFor(weatherCode: number): string {
  return ICONS[categorize(weatherCode)];
}

// WMO weather interpretation codes (公開標準、Open-Meteoが準拠)
const WMO_LABELS: Record<number, string> = {
  0: "快晴",
  1: "晴れ",
  2: "一部曇り",
  3: "曇り",
  45: "霧",
  48: "霧氷",
  51: "弱い霧雨",
  53: "霧雨",
  55: "強い霧雨",
  56: "着氷性の弱い霧雨",
  57: "着氷性の霧雨",
  61: "弱い雨",
  63: "雨",
  65: "強い雨",
  66: "着氷性の弱い雨",
  67: "着氷性の雨",
  71: "弱い雪",
  73: "雪",
  75: "強い雪",
  77: "霧雪",
  80: "弱いにわか雨",
  81: "にわか雨",
  82: "激しいにわか雨",
  85: "弱いにわか雪",
  86: "にわか雪",
  95: "雷雨",
  96: "雷雨(弱い雹)",
  99: "雷雨(激しい雹)",
};

export function labelFor(weatherCode: number): string {
  return WMO_LABELS[weatherCode] ?? "不明";
}

const COMPASS_LABELS = [
  "北", "北北東", "北東", "東北東",
  "東", "東南東", "南東", "南南東",
  "南", "南南西", "南西", "西南西",
  "西", "西北西", "北西", "北北西",
];

export function compassLabel(degrees: number): string {
  const index = Math.round(degrees / 22.5) % 16;
  return COMPASS_LABELS[(index + 16) % 16];
}
