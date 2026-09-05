// TTL付き天気キャッシュ(cache/weather_cache.py からの移植、KV版)。
//
// KVの expirationTtl は「値の自動削除」用であり、そのまま使うと差分アラート判定に
// 必要な「TTLが切れた後の直前値」まで消えてしまう。そのため削除用のTTLは長め
// (7日、単なるストレージ衛生)に設定し、キャッシュヒット判定自体は保存した
// fetchedAt を見て手動で行う(Python版のロジックをそのまま踏襲)。
// KV_ENTRY_EXPIRATION_SECONDS は必ず TTL_SECONDS より大きくなければならない
// (でなければ直前値が消えて差分アラートが発火しなくなる)ため、起動時に検証する。

import type { ExecutionContext } from "hono";
import { computeDiff } from "./alerts";
import { sendDiffToAllSubscriptions } from "./push";
import type { Env, WeatherObservation } from "./types";
import { fetchCurrentObservation } from "./weather";

const TTL_SECONDS = 600;
const KV_ENTRY_EXPIRATION_SECONDS = 60 * 60 * 24 * 7;

if (KV_ENTRY_EXPIRATION_SECONDS <= TTL_SECONDS) {
  throw new Error("KV_ENTRY_EXPIRATION_SECONDS must be greater than TTL_SECONDS");
}

interface CacheEntry {
  observation: WeatherObservation;
  fetchedAt: number;
}

function roundKey(lat: number, lon: number): string {
  return `weather:${lat.toFixed(2)},${lon.toFixed(2)}`;
}

function parseEntry(raw: string | null): CacheEntry | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CacheEntry;
  } catch {
    // 破損したキャッシュ値はミス扱いにして再フェッチする。
    console.warn("[cache] キャッシュ値のJSONが不正なため再フェッチします。");
    return null;
  }
}

export async function getOrFetchWeather(
  env: Env,
  ctx: ExecutionContext,
  lat: number,
  lon: number,
): Promise<WeatherObservation> {
  const key = roundKey(lat, lon);
  const entry = parseEntry(await env.WEATHER_CACHE.get(key));

  if (entry && Date.now() - entry.fetchedAt < TTL_SECONDS * 1000) {
    // このバケットに最初にキャッシュした地点の厳密な緯度経度ではなく、
    // 今回リクエストされた緯度経度を返す(丸めキーは同一でも要求座標は異なりうる)。
    return { ...entry.observation, lat, lon };
  }

  const observation = await fetchCurrentObservation(lat, lon);

  // KVへの書き込みとPush通知判定はレスポンスを待たせる必要がないため、
  // 呼び出し元への応答を返した後にバックグラウンドで実行する。
  ctx.waitUntil(
    (async () => {
      const nextEntry: CacheEntry = { observation, fetchedAt: Date.now() };
      await env.WEATHER_CACHE.put(key, JSON.stringify(nextEntry), {
        expirationTtl: KV_ENTRY_EXPIRATION_SECONDS,
      });

      const diff = computeDiff(entry?.observation ?? null, observation);
      if (diff) {
        await sendDiffToAllSubscriptions(env, diff);
      }
    })(),
  );

  return observation;
}
