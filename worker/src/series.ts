// 複数地点の予報系列(地図アトラスの左一覧・メッシュ表示用)。
//
// Open-Meteoは latitude=a,b,c&longitude=x,y,z のように複数座標を1リクエストで
// 受け付けるため、地点ごとに叩かず1回にまとめる。値は「いま(JSTの現在時刻の属する時)
// から3時間刻みで+72時間まで」の25点に間引く(画面の時間スライダーと同じ刻み)。

import type {
  Env,
  GridMeta,
  GridSeriesSet,
  SeriesPoint,
  SeriesSet,
} from "./types";
import { fetchOpenMeteo } from "./weather";

export const STEP_HOURS = 3;
export const STEP_COUNT = 25; // 0, 3, ..., 72時間先
const FRESH_SECONDS = 30 * 60;
const STORAGE_SECONDS = 60 * 60 * 2;

const HOURLY_PARAMS = [
  "temperature_2m",
  "precipitation_probability",
  "precipitation",
  "wind_speed_10m",
  "weather_code",
].join(",");

export interface Coord {
  lat: number;
  lon: number;
}

function jstFloorHourKey(date: Date): string {
  const jst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return `${jst.toISOString().slice(0, 13)}:00`;
}

/** hourly.timeの中から、3時間刻みで間引くインデックスを返す(現在時刻の属する時から)。 */
export function pickStepIndices(times: string[], now: Date): number[] {
  const start = Math.max(0, times.indexOf(jstFloorHourKey(now)));
  const indices: number[] = [];
  for (let i = 0; i < STEP_COUNT; i++) {
    const idx = start + i * STEP_HOURS;
    if (idx >= times.length) break;
    indices.push(idx);
  }
  return indices;
}

function pick<T>(
  values: (T | null | undefined)[],
  indices: number[],
): (T | null)[] {
  return indices.map((i) => values[i] ?? null);
}

export async function fetchSeries(
  coords: Coord[],
  now = new Date(),
): Promise<SeriesSet> {
  const raw = await fetchOpenMeteo({
    latitude: coords.map((c) => c.lat).join(","),
    longitude: coords.map((c) => c.lon).join(","),
    hourly: HOURLY_PARAMS,
    // 現在が23時台でも+72時間ぶんをカバーするため4日分取得する。
    forecast_days: "4",
    wind_speed_unit: "ms",
    timezone: "Asia/Tokyo",
  });

  // 1地点のときはオブジェクト、複数地点のときは配列で返る。
  const results: any[] = Array.isArray(raw) ? raw : [raw];
  const indices = pickStepIndices(results[0].hourly.time, now);
  const times = indices.map((i) => results[0].hourly.time[i] as string);

  const points: SeriesPoint[] = results.map((r, i) => ({
    lat: coords[i].lat,
    lon: coords[i].lon,
    temperatureC: pick<number>(r.hourly.temperature_2m, indices),
    precipitationProbabilityPercent: pick<number>(
      r.hourly.precipitation_probability,
      indices,
    ),
    precipitationMm: pick<number>(r.hourly.precipitation, indices),
    windSpeedMs: pick<number>(r.hourly.wind_speed_10m, indices),
    weatherCode: pick<number>(r.hourly.weather_code, indices),
  }));

  return { fetchedAt: now.toISOString(), stepHours: STEP_HOURS, times, points };
}

/** 中心座標をセル幅に丸めたn×nの格子点(南西から東へ、南から北へのrow-major)。 */
export function buildGrid(
  lat: number,
  lon: number,
  span: number,
  n: number,
): { coords: Coord[]; grid: GridMeta } {
  const step = span / n;
  const centerLat = Math.round(lat / step) * step;
  const centerLon = Math.round(lon / step) * step;
  const coords: Coord[] = [];
  for (let row = 0; row < n; row++) {
    for (let col = 0; col < n; col++) {
      coords.push({
        lat: round4(centerLat + (row - (n - 1) / 2) * step),
        lon: round4(centerLon + (col - (n - 1) / 2) * step),
      });
    }
  }
  return {
    coords,
    grid: {
      n,
      step: round4(step),
      centerLat: round4(centerLat),
      centerLon: round4(centerLon),
    },
  };
}

function round4(v: number): number {
  return Math.round(v * 10000) / 10000;
}

async function cacheKey(prefix: string, coords: Coord[]): Promise<string> {
  const text = coords
    .map((c) => `${c.lat.toFixed(2)},${c.lon.toFixed(2)}`)
    .join(";");
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text),
  );
  const hex = [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `${prefix}:${hex}`;
}

interface CachedSeries {
  series: SeriesSet;
  fetchedAt: number;
}

export async function getOrFetchSeries(
  env: Env,
  ctx: { waitUntil(p: Promise<unknown>): void },
  coords: Coord[],
): Promise<SeriesSet> {
  const key = await cacheKey("series", coords);
  const cached = await env.WEATHER_CACHE.get(key).then((raw) => {
    if (!raw) return null;
    try {
      return JSON.parse(raw) as CachedSeries;
    } catch {
      return null;
    }
  });
  if (cached && Date.now() - cached.fetchedAt < FRESH_SECONDS * 1000)
    return cached.series;

  const series = await fetchSeries(coords);
  const entry: CachedSeries = { series, fetchedAt: Date.now() };
  ctx.waitUntil(
    env.WEATHER_CACHE.put(key, JSON.stringify(entry), {
      expirationTtl: STORAGE_SECONDS,
    }),
  );
  return series;
}

export async function getOrFetchGrid(
  env: Env,
  ctx: { waitUntil(p: Promise<unknown>): void },
  lat: number,
  lon: number,
  span: number,
  n: number,
): Promise<GridSeriesSet> {
  const { coords, grid } = buildGrid(lat, lon, span, n);
  const series = await getOrFetchSeries(env, ctx, coords);
  return { ...series, grid };
}
