// WeatherGeoBridge REST APIサーバー(Cloudflare Workers版、server/api_server.py からの移植)。
// Phase1相当のロジック(weather.ts/cache.ts)を薄くラップするだけで、
// 天気取得ロジックをここで再実装しない。

import { Hono } from "hono";
import { cors } from "hono/cors";
import { requireApiKey } from "./auth";
import { getOrFetchWeather } from "./cache";
import { addSubscription } from "./push";
import { runScheduledAlertCheck } from "./scheduled";
import { getOrFetchGrid, getOrFetchSeries } from "./series";
import type { Env } from "./types";
import {
  parseDays,
  parseGridParams,
  parseLatLon,
  parsePoints,
  parsePushSubscription,
  MAX_SERIES_POINTS,
} from "./validate";
import {
  fetchAirQuality,
  fetchForecast,
  fetchHistoricalComparison,
  WeatherClientError,
} from "./weather";

const app = new Hono<{ Bindings: Env }>();

// CORSは許可リスト方式にする(以前は"*")。ブラウザは通常Next.jsのAPI Route
// (server-side)経由でここを呼ぶためCORSを必要とせず、許可は直接呼び出しが
// 必要な自サイトのオリジンだけに絞る。ALLOWED_ORIGINS未設定なら全拒否。
app.use("*", (c, next) => {
  const allowed = (c.env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return cors({
    origin: (origin) => (allowed.includes(origin) ? origin : null),
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "X-API-Key"],
    maxAge: 86400,
  })(c, next);
});

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

app.get("/api/air-quality", requireApiKey, async (c) => {
  const latlon = parseLatLon(c.req.query("lat"), c.req.query("lon"));
  if (!latlon) {
    return c.json({ error: "lat/lonは必須です(緯度-90〜90、経度-180〜180)" }, 400);
  }
  try {
    const airQuality = await fetchAirQuality(latlon.lat, latlon.lon);
    return c.json(airQuality);
  } catch (err) {
    const [body, status] = weatherErrorResponse(err);
    return c.json(body, status);
  }
});

app.get("/api/weather/history", requireApiKey, async (c) => {
  const latlon = parseLatLon(c.req.query("lat"), c.req.query("lon"));
  if (!latlon) {
    return c.json({ error: "lat/lonは必須です(緯度-90〜90、経度-180〜180)" }, 400);
  }
  try {
    const comparison = await fetchHistoricalComparison(latlon.lat, latlon.lon);
    return c.json(comparison);
  } catch (err) {
    const [body, status] = weatherErrorResponse(err);
    return c.json(body, status);
  }
});

app.get("/api/weather/series", requireApiKey, async (c) => {
  const points = parsePoints(c.req.query("points"));
  if (!points) {
    return c.json(
      { error: `pointsは"lat,lon;lat,lon"形式で1〜${MAX_SERIES_POINTS}件まで指定してください` },
      400,
    );
  }
  try {
    return c.json(await getOrFetchSeries(c.env, c.executionCtx, points));
  } catch (err) {
    const [body, status] = weatherErrorResponse(err);
    return c.json(body, status);
  }
});

app.get("/api/weather/grid", requireApiKey, async (c) => {
  const params = parseGridParams((k) => c.req.query(k));
  if (!params) {
    return c.json(
      { error: "lat/lon必須、spanは0.4〜6(度)、nは4〜10の整数で指定してください" },
      400,
    );
  }
  try {
    return c.json(
      await getOrFetchGrid(c.env, c.executionCtx, params.lat, params.lon, params.span, params.n),
    );
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

export default {
  fetch: app.fetch,
  // Cronトリガー(wrangler.jsoncのtriggers.crons)から定期実行される。
  // レスポンスを返す必要がないHTTPリクエスト外の処理なので、waitUntilで
  // Workerの実行が完了するまで待たせる。
  scheduled(_event: ScheduledController, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(runScheduledAlertCheck(env));
  },
} satisfies ExportedHandler<Env>;
