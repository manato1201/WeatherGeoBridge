// WeatherGeoBridge REST APIサーバー(Cloudflare Workers版、server/api_server.py からの移植)。
// Phase1相当のロジック(weather.ts/cache.ts)を薄くラップするだけで、
// 天気取得ロジックをここで再実装しない。

import { Hono } from "hono";
import { cors } from "hono/cors";
import { requireApiKey } from "./auth";
import { getOrFetchWeather } from "./cache";
import { addSubscription } from "./push";
import type { Env } from "./types";
import { parseDays, parseLatLon, parsePushSubscription } from "./validate";
import { fetchForecast, WeatherClientError } from "./weather";

const app = new Hono<{ Bindings: Env }>();

app.use("*", cors({ origin: "*", allowHeaders: ["Content-Type", "X-API-Key"] }));

app.get("/health", (c) => c.json({ status: "ok", server: "weathergeobridge-api" }));

app.get("/api/push/vapid-public-key", (c) => c.json({ publicKey: c.env.VAPID_PUBLIC_KEY ?? "" }));

function weatherErrorResponse(err: unknown): [{ error: string }, 400 | 502] {
  if (err instanceof WeatherClientError && err.status && err.status < 500) {
    // Open-Meteo自体が4xxを返した(=座標等の入力不備)場合は、呼び出し側のミスとして400を返す。
    return [{ error: err.message }, 400];
  }
  return [{ error: String(err instanceof Error ? err.message : err) }, 502];
}

app.get("/api/weather", requireApiKey, async (c) => {
  const latlon = parseLatLon(c.req.query("lat"), c.req.query("lon"));
  if (!latlon) {
    return c.json({ error: "lat/lonは必須です(緯度-90〜90、経度-180〜180)" }, 400);
  }
  try {
    const observation = await getOrFetchWeather(c.env, c.executionCtx, latlon.lat, latlon.lon);
    return c.json(observation);
  } catch (err) {
    const [body, status] = weatherErrorResponse(err);
    return c.json(body, status);
  }
});

app.get("/api/weather/forecast", requireApiKey, async (c) => {
  const latlon = parseLatLon(c.req.query("lat"), c.req.query("lon"));
  if (!latlon) {
    return c.json({ error: "lat/lonは必須です(緯度-90〜90、経度-180〜180)" }, 400);
  }
  const days = parseDays(c.req.query("days"), 3);
  if (days === null) {
    return c.json({ error: "daysは1〜16の整数で指定してください" }, 400);
  }
  try {
    const forecast = await fetchForecast(latlon.lat, latlon.lon, days);
    return c.json(forecast);
  } catch (err) {
    const [body, status] = weatherErrorResponse(err);
    return c.json(body, status);
  }
});

app.post("/api/push/subscribe", requireApiKey, async (c) => {
  let rawBody: unknown;
  try {
    rawBody = await c.req.json();
  } catch {
    return c.json({ error: "リクエストボディが不正なJSONです" }, 400);
  }

  const subscription = parsePushSubscription(rawBody);
  if (!subscription) {
    return c.json({ error: "endpoint/keys.p256dh/keys.authは必須です" }, 400);
  }

  await addSubscription(c.env, subscription);
  return c.json({ ok: true }, 201);
});

app.notFound((c) => c.json({ error: "Not found" }, 404));

export default app;
