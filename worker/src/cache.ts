// TTL付き天気キャッシュ(cache/weather_cache.py からの移植、KV版)。
//
// KVの expirationTtl は「値の自動削除」用であり、そのまま使うと差分アラート判定に
// 必要な「TTLが切れた後の直前値」まで消えてしまう。そのため削除用のTTLは長め
// (7日、単なるストレージ衛生)に設定し、キャッシュヒット判定自体は保存した
// fetchedAt を見て手動で行う(Python版のロジックをそのまま踏襲)。

import { checkAlerts } from "./alerts";
import { sendAlertsToAllSubscriptions } from "./push";
import type { Env, WeatherObservation } from "./types";
import { fetchCurrentObservation } from "./weather";

const TTL_SECONDS = 600;
const KV_ENTRY_EXPIRATION_SECONDS = 60 * 60 * 24 * 7;

interface CacheEntry {
  observation: WeatherObservation;
  fetchedAt: number;
}

function roundKey(lat: number, lon: number): string {
  return `weather:${lat.toFixed(2)},${lon.toFixed(2)}`;
}

interface WaitUntilCtx {
  waitUntil(promise: Promise<unknown>): void;
}

export async function getOrFetchWeather(
  env: Env,
  ctx: WaitUntilCtx,
  lat: number,
  lon: number,
): Promise<WeatherObservation> {
  const key = roundKey(lat, lon);
  const raw = await env.WEATHER_CACHE.get(key);
  const entry: CacheEntry | null = raw ? JSON.parse(raw) : null;

  if (entry && Date.now() - entry.fetchedAt < TTL_SECONDS * 1000) {
    return entry.observation;
  }

  const observation = await fetchCurrentObservation(lat, lon);
  const nextEntry: CacheEntry = { observation, fetchedAt: Date.now() };
  await env.WEATHER_CACHE.put(key, JSON.stringify(nextEntry), {
    expirationTtl: KV_ENTRY_EXPIRATION_SECONDS,
  });

  const alerts = checkAlerts(entry?.observation ?? null, observation);
  if (alerts.length > 0) {
    ctx.waitUntil(sendAlertsToAllSubscriptions(env, alerts));
  }

  return observation;
}
