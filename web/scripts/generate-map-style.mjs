// public/map/style.json を生成するスクリプト。
// アプリのダークパレット(app/globals.cssのトークンと同じ値)に合わせて
// @protomaps/basemapsのBLACKフレーバーを上書きし、実際に配置したR2上の
// PMTilesファイルを参照するMapLibreスタイルを書き出す。
//
// パレットを変更した場合は `node scripts/generate-map-style.mjs` を再実行する。

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { BLACK, layers } from "@protomaps/basemaps";

const PMTILES_URL =
  "https://pub-b3aa2a3d1ce1437cbe647e4e80e0c193.r2.dev/japan.pmtiles";

// app/globals.cssのダークテーマトークンと合わせる。
const flavor = {
  ...BLACK,
  background: "#12130f", // --color-canvas
  earth: "#12130f",
  wood_a: "#171812",
  wood_b: "#171812",
  park_a: "#171812",
  park_b: "#171812",
  scrub_a: "#171812",
  scrub_b: "#171812",
  glacier: "#171812",
  sand: "#1c1d16",
  beach: "#1c1d16",
  pedestrian: "#202119", // --color-surface-alt
  aerodrome: "#202119",
  hospital: "#202119",
  industrial: "#191a14",
  school: "#191a14",
  zoo: "#191a14",
  military: "#161710",
  water: "#1c2b33",
  buildings: "#1a1b16", // --color-paper
  runway: "#3c3c38",
  pier: "#1a1b16",
};

const style = {
  version: 8,
  name: "WeatherGeoBridge Base (Dark)",
  sources: {
    japan: {
      type: "vector",
      url: `pmtiles://${PMTILES_URL}`,
      attribution:
        '© <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors',
    },
  },
  glyphs:
    "https://protomaps.github.io/basemaps-assets/fonts/{fontstack}/{range}.pbf",
  sprite: "https://protomaps.github.io/basemaps-assets/sprites/v4/black",
  layers: layers("japan", flavor, { lang: "ja" }),
};

const outPath = fileURLToPath(
  new URL("../public/map/style.json", import.meta.url),
);
writeFileSync(outPath, JSON.stringify(style, null, 2) + "\n");
console.log(`Wrote ${outPath} (${style.layers.length} layers)`);
