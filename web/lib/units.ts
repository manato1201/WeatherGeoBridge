// 単位変換ヘルパー。表示専用(APIレスポンス自体は常に℃・m/s)。

export type TempUnit = "C" | "F";
export type SpeedUnit = "ms" | "kmh";

export function formatTemp(celsius: number, unit: TempUnit): string {
  const value = unit === "F" ? (celsius * 9) / 5 + 32 : celsius;
  return `${value.toFixed(1)}°${unit}`;
}

export function formatTempInt(celsius: number, unit: TempUnit): string {
  const value = unit === "F" ? (celsius * 9) / 5 + 32 : celsius;
  return `${Math.round(value)}°`;
}

export function formatSpeed(metersPerSecond: number, unit: SpeedUnit): string {
  const value = unit === "kmh" ? metersPerSecond * 3.6 : metersPerSecond;
  const label = unit === "kmh" ? "km/h" : "m/s";
  return `${value.toFixed(1)}${label}`;
}
