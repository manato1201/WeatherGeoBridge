// WMO weather_code の簡易カテゴリ分類。
// WeatherGeoBridge_DESIGN.md Phase6 の MapToCategory 設計をUI表示用途にも流用する。

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
