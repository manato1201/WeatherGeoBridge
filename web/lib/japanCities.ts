// 主要都市の緯度経度(公開情報)。Open-MeteoのGeocoding APIは日本語地名検索に
// 対応していないため、ローマ字入力なしでも選べるようワンタップの候補として用意する。

export interface CityPreset {
  name: string;
  lat: number;
  lon: number;
}

export const JAPAN_CITY_PRESETS: CityPreset[] = [
  { name: "札幌", lat: 43.0618, lon: 141.3545 },
  { name: "仙台", lat: 38.2682, lon: 140.8694 },
  { name: "東京", lat: 35.6812, lon: 139.7671 },
  { name: "横浜", lat: 35.4437, lon: 139.638 },
  { name: "名古屋", lat: 35.1815, lon: 136.9066 },
  { name: "大阪", lat: 34.6937, lon: 135.5023 },
  { name: "京都", lat: 35.0116, lon: 135.7681 },
  { name: "広島", lat: 34.3853, lon: 132.4553 },
  { name: "福岡", lat: 33.5904, lon: 130.4017 },
  { name: "那覇", lat: 26.2124, lon: 127.6809 },
];
