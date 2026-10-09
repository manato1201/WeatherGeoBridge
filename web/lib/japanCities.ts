// 主要都市の緯度経度(公開情報)。Open-MeteoのGeocoding APIは日本語地名検索に
// 対応していないため、ローマ字入力なしでも選べるようワンタップの候補として用意する。
// 地名は日本語を主、英字(ローマ字)は小さな副題として出す(IMPROVEMENT_DESIGN_2026-10.md 3章)。

export interface CityPreset {
  name: string;
  romaji: string;
  lat: number;
  lon: number;
}

export const JAPAN_CITY_PRESETS: CityPreset[] = [
  { name: "札幌", romaji: "SAPPORO", lat: 43.0618, lon: 141.3545 },
  { name: "仙台", romaji: "SENDAI", lat: 38.2682, lon: 140.8694 },
  { name: "東京", romaji: "TOKYO", lat: 35.6812, lon: 139.7671 },
  { name: "横浜", romaji: "YOKOHAMA", lat: 35.4437, lon: 139.638 },
  { name: "名古屋", romaji: "NAGOYA", lat: 35.1815, lon: 136.9066 },
  { name: "大阪", romaji: "OSAKA", lat: 34.6937, lon: 135.5023 },
  { name: "京都", romaji: "KYOTO", lat: 35.0116, lon: 135.7681 },
  { name: "広島", romaji: "HIROSHIMA", lat: 34.3853, lon: 132.4553 },
  { name: "福岡", romaji: "FUKUOKA", lat: 33.5904, lon: 130.4017 },
  { name: "那覇", romaji: "NAHA", lat: 26.2124, lon: 127.6809 },
];
