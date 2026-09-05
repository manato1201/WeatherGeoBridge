// European AQIの標準区分(公開情報)を日本語ラベルに変換する。
// デザインシステムがモノクローム(赤はエラー専用)のため、深刻度は色ではなく
// テキストラベルで表現する。

export function europeanAqiLabel(aqi: number): string {
  if (aqi <= 20) return "良好";
  if (aqi <= 40) return "普通";
  if (aqi <= 60) return "やや注意";
  if (aqi <= 80) return "注意";
  if (aqi <= 100) return "警戒";
  return "厳重警戒";
}
