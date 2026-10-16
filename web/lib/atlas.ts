// アトラス画面(IMPROVEMENT_DESIGN_2026-10.md 4.1)の純粋関数。
// 地図の色・高さ・左一覧・凡例がすべて同じ関数を通るようにして、
// 「2Dと3Dで同じ数値」「高さの値がAPIの数値と一致」を構造的に保証する。

export type AtlasMetric = "temperature" | "precipitation" | "wind";

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
  fetchedAt: string;
  stepHours: number;
  times: string[];
  points: SeriesPoint[];
}

export interface GridSeriesSet extends SeriesSet {
  grid: { n: number; step: number; centerLat: number; centerLon: number };
}

type Stop = readonly [value: number, hex: string];

interface MetricDef {
  label: string;
  unit: string;
  /** 色のランプ。気温=暖色、降水=青、風=灰(色だけで値を読ませず凡例と数値も出す)。 */
  stops: readonly Stop[];
  /** 立体表示で値1あたりに立ち上げる高さ(m)。凡例に同じ数字を出す。 */
  heightPerUnitM: number;
  /** この値未満は高さ0(気温の0℃未満)。 */
  floor: number;
  /** 凡例の目盛り。 */
  ticks: readonly number[];
  fractionDigits: number;
}

export const METRICS: Record<AtlasMetric, MetricDef> = {
  temperature: {
    label: "気温",
    unit: "℃",
    stops: [
      [-5, "#fff8dc"],
      [10, "#ffe08a"],
      [20, "#ffb347"],
      [30, "#ff7043"],
      [38, "#c62828"],
    ],
    heightPerUnitM: 1500,
    floor: 0,
    ticks: [0, 10, 20, 30],
    fractionDigits: 1,
  },
  precipitation: {
    label: "降水",
    unit: "%",
    stops: [
      [0, "#eef6ff"],
      [30, "#a9d0f5"],
      [60, "#4c97e6"],
      [100, "#1b4fb0"],
    ],
    heightPerUnitM: 800,
    floor: 0,
    ticks: [0, 30, 60, 100],
    fractionDigits: 0,
  },
  wind: {
    label: "風",
    unit: "m/s",
    stops: [
      [0, "#f1f1f1"],
      [8, "#b5b5b5"],
      [16, "#6e6e6e"],
      [25, "#2b2b2b"],
    ],
    heightPerUnitM: 4000,
    floor: 0,
    ticks: [0, 5, 10, 20],
    fractionDigits: 1,
  },
};

export const NO_DATA_COLOR = "#d0d0d0";

function hexToRgb(hex: string): [number, number, number] {
  const v = parseInt(hex.slice(1), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

function rgbToHex([r, g, b]: [number, number, number]): string {
  return `#${[r, g, b].map((c) => Math.round(c).toString(16).padStart(2, "0")).join("")}`;
}

/** ランプ上の色(範囲外は端の色)。 */
export function rampColor(stops: readonly Stop[], value: number): string {
  if (value <= stops[0][0]) return stops[0][1];
  const last = stops[stops.length - 1];
  if (value >= last[0]) return last[1];
  for (let i = 1; i < stops.length; i++) {
    const [v1, c1] = stops[i];
    if (value <= v1) {
      const [v0, c0] = stops[i - 1];
      const t = (value - v0) / (v1 - v0);
      const a = hexToRgb(c0);
      const b = hexToRgb(c1);
      return rgbToHex([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]);
    }
  }
  return last[1];
}

export function valueAt(
  point: SeriesPoint,
  metric: AtlasMetric,
  index: number,
): number | null {
  switch (metric) {
    case "temperature":
      return point.temperatureC[index] ?? null;
    case "precipitation":
      return point.precipitationProbabilityPercent[index] ?? null;
    case "wind":
      return point.windSpeedMs[index] ?? null;
  }
}

/** 立体表示の高さ(m)。値に比例し、floor未満は0。 */
export function heightFor(metric: AtlasMetric, value: number | null): number {
  if (value === null) return 0;
  const def = METRICS[metric];
  return Math.max(0, value - def.floor) * def.heightPerUnitM;
}

export function colorFor(metric: AtlasMetric, value: number | null): string {
  return value === null ? NO_DATA_COLOR : rampColor(METRICS[metric].stops, value);
}

export function formatValue(metric: AtlasMetric, value: number | null): string {
  if (value === null) return "—";
  const def = METRICS[metric];
  return `${value.toFixed(def.fractionDigits)}${def.unit}`;
}

export function legendGradient(metric: AtlasMetric): string {
  const { stops } = METRICS[metric];
  const min = stops[0][0];
  const max = stops[stops.length - 1][0];
  const parts = stops.map(([v, hex]) => `${hex} ${(((v - min) / (max - min)) * 100).toFixed(1)}%`);
  return `linear-gradient(90deg, ${parts.join(", ")})`;
}

export function legendTickPosition(metric: AtlasMetric, tick: number): number {
  const { stops } = METRICS[metric];
  const min = stops[0][0];
  const max = stops[stops.length - 1][0];
  return Math.min(100, Math.max(0, ((tick - min) / (max - min)) * 100));
}

/** 高さの読み方(凡例に出す文)。 */
export function heightNote(metric: AtlasMetric): string {
  const def = METRICS[metric];
  const perUnitKm = def.heightPerUnitM / 1000;
  const floorNote = metric === "temperature" ? "(0℃未満は平ら)" : "";
  return `高さ: 1${def.unit} = ${perUnitKm}km${floorNote}`;
}

export interface MeshFeatureProps {
  value: number | null;
  height: number;
  color: string;
  temperature: string;
  precipitation: string;
  wind: string;
}

type Position = [number, number];

/** メッシュの各セルを、指定時刻・指定指標の値で色と高さを付けたGeoJSONにする。 */
export function buildMeshGeoJson(
  grid: GridSeriesSet,
  metric: AtlasMetric,
  index: number,
): GeoJSON.FeatureCollection<GeoJSON.Polygon, MeshFeatureProps> {
  // セル同士を少し離し、立体表示で柱が分かれて見えるようにする。
  const half = (grid.grid.step / 2) * 0.94;
  return {
    type: "FeatureCollection",
    features: grid.points.map((p) => {
      const value = valueAt(p, metric, index);
      const ring: Position[] = [
        [p.lon - half, p.lat - half],
        [p.lon + half, p.lat - half],
        [p.lon + half, p.lat + half],
        [p.lon - half, p.lat + half],
        [p.lon - half, p.lat - half],
      ];
      return {
        type: "Feature" as const,
        geometry: { type: "Polygon" as const, coordinates: [ring] },
        properties: {
          value,
          height: heightFor(metric, value),
          color: colorFor(metric, value),
          temperature: formatValue("temperature", valueAt(p, "temperature", index)),
          precipitation: formatValue("precipitation", valueAt(p, "precipitation", index)),
          wind: formatValue("wind", valueAt(p, "wind", index)),
        },
      };
    }),
  };
}

/** 2つのメッシュを t(0〜1)で補間する。高さと色だけを滑らかに動かし、値の文字列は
 *  常に目標側(to)のものを使う。t=1 では to と完全に同じになるので、補間の途中経過が
 *  終わったあとの表示は API の数値と一致する。 */
export function lerpMesh(
  from: GeoJSON.FeatureCollection<GeoJSON.Polygon, MeshFeatureProps>,
  to: GeoJSON.FeatureCollection<GeoJSON.Polygon, MeshFeatureProps>,
  t: number,
): GeoJSON.FeatureCollection<GeoJSON.Polygon, MeshFeatureProps> {
  if (t >= 1 || from.features.length !== to.features.length) return to;
  return {
    type: "FeatureCollection",
    features: to.features.map((f, i) => {
      const a = from.features[i].properties;
      const ca = hexToRgb(a.color);
      const cb = hexToRgb(f.properties.color);
      return {
        ...f,
        properties: {
          ...f.properties,
          height: a.height + (f.properties.height - a.height) * t,
          color: rgbToHex([
            ca[0] + (cb[0] - ca[0]) * t,
            ca[1] + (cb[1] - ca[1]) * t,
            ca[2] + (cb[2] - ca[2]) * t,
          ]),
        },
      };
    }),
  };
}

/** 高さだけ0にした同じメッシュ(「立体」へ切り替えたとき、柱が立ち上がる起点)。 */
export function flattenMesh(
  mesh: GeoJSON.FeatureCollection<GeoJSON.Polygon, MeshFeatureProps>,
): GeoJSON.FeatureCollection<GeoJSON.Polygon, MeshFeatureProps> {
  return {
    ...mesh,
    features: mesh.features.map((f) => ({
      ...f,
      properties: { ...f.properties, height: 0 },
    })),
  };
}

// ── 予報の「注意」(気象庁の警報・注意報ではない) ─────────────────────
// 予報値が下の目安を超えた時刻を機械的に拾うだけのもの。公式の警報・注意報とは別物で、
// 画面にもそう明記する(P9)。

export type CautionKind = "rain" | "wind" | "heat" | "cold";

export interface Caution {
  kind: CautionKind;
  label: string;
  /** 目安を超えた実測ではなく「予報値」の表記(例: 降水確率80%)。 */
  detail: string;
}

export const CAUTION_RULES = {
  rainPercent: 70,
  windMs: 10,
  heatC: 35,
  coldC: 0,
} as const;

export function cautionsAt(point: SeriesPoint, index: number): Caution[] {
  const out: Caution[] = [];
  const rain = point.precipitationProbabilityPercent[index];
  const wind = point.windSpeedMs[index];
  const temp = point.temperatureC[index];
  if (rain != null && rain >= CAUTION_RULES.rainPercent) {
    out.push({ kind: "rain", label: "雨", detail: `降水確率${rain.toFixed(0)}%` });
  }
  if (wind != null && wind >= CAUTION_RULES.windMs) {
    out.push({ kind: "wind", label: "強風", detail: `風${wind.toFixed(1)}m/s` });
  }
  if (temp != null && temp >= CAUTION_RULES.heatC) {
    out.push({ kind: "heat", label: "暑さ", detail: `気温${temp.toFixed(1)}℃` });
  }
  if (temp != null && temp <= CAUTION_RULES.coldC) {
    out.push({ kind: "cold", label: "冷え込み", detail: `気温${temp.toFixed(1)}℃` });
  }
  return out;
}

export interface CautionItem {
  name: string;
  time: string;
  caution: Caution;
}

/** 区間[from, to]で、地点×種類ごとに最初に目安を超える時刻を1件ずつ拾う。 */
export function collectCautions(
  points: SeriesPoint[],
  names: string[],
  times: string[],
  from: number,
  to: number,
): CautionItem[] {
  const items: CautionItem[] = [];
  points.forEach((point, pi) => {
    const seen = new Set<CautionKind>();
    for (let i = from; i <= Math.min(to, times.length - 1); i++) {
      for (const c of cautionsAt(point, i)) {
        if (seen.has(c.kind)) continue;
        seen.add(c.kind);
        items.push({ name: names[pi] ?? "", time: times[i], caution: c });
      }
    }
  });
  return items.sort((a, b) => a.time.localeCompare(b.time));
}

/** 「10/9 15時」。ティッカー用の短い時刻表記。 */
export function formatShortTime(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2})/.exec(iso);
  if (!m) return iso;
  return `${Number(m[2])}/${Number(m[3])} ${m[4]}時`;
}

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

/** "2026-10-09T15:00"(JSTのローカル時刻文字列)を「10月9日(金) 15:00」にする。 */
export function formatTimeLabel(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(iso);
  if (!m) return iso;
  const [, y, mo, d, hh, mm] = m;
  const weekday = WEEKDAYS[new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d))).getUTCDay()];
  return `${Number(mo)}月${Number(d)}日(${weekday}) ${hh}:${mm}`;
}

/** 取得時刻(UTCのISO)をJSTの「10/9 12:15」にする。 */
export function formatFetchedAt(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

/** 2点間の概算距離(km、球面近似)。「近い順」の並べ替え用。 */
export function distanceKm(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLon = toRad(bLon - aLon);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
