// WeatherGeoBridge REST APIサーバー(Cloudflare Workers版、server/api_server.py からの移植)。
// Phase1相当のロジック(weather.ts/cache.ts)を薄くラップするだけで、
// 天気取得ロジックをここで再実装しない。

import { Hono } from "hono";
import { cors } from "hono/cors";
import { requireApiKey } from "./auth";
import { getOrFetchWeather } from "./cache";
import { addSubscription } from "./push";
import type { Env } from "./types";
import { fetchForecast } from "./weather";

const app = new Hono<{ Bindings: Env }>();

app.use("*", cors({ origin: "*", allowHeaders: ["Content-Type", "X-API-Key"] }));

app.get("/health", (c) => c.json({ status: "ok", server: "weathergeobridge-api" }));

app.get("/api/push/vapid-public-key", (c) => c.json({ publicKey: c.env.VAPID_PUBLIC_KEY ?? "" }));

app.get("/api/weather", requireApiKey, async (c) => {
  const lat = Number(c.req.query("lat"));
  const lon = Number(c.req.query("lon"));
  if (Number.isNaN(lat) || Number.isNaN(lon)) {
    return c.json({ error: "lat/lonは必須です" }, 400);
  }
  try {
    const observation = await getOrFetchWeather(c.env, c.executionCtx, lat, lon);
    return c.json(observation);
  } catch (err) {
    return c.json({ error: String(err) }, 502);
  }
});

app.get("/api/weather/forecast", requireApiKey, async (c) => {
  const lat = Number(c.req.query("lat"));
  const lon = Number(c.req.query("lon"));
  const days = Number(c.req.query("days") ?? "3");
  if (Number.isNaN(lat) || Number.isNaN(lon)) {
    return c.json({ error: "lat/lonは必須です" }, 400);
  }
  try {
    const forecast = await fetchForecast(lat, lon, days);
    return c.json(forecast);
  } catch (err) {
    return c.json({ error: String(err) }, 502);
  }
});

app.post("/api/push/subscribe", requireApiKey, async (c) => {
  const body = await c.req.json<{ endpoint?: string }>();
  if (!body.endpoint) {
    return c.json({ error: "endpointは必須です" }, 400);
  }
  await addSubscription(c.env, body as any);
  return c.json({ ok: true }, 201);
});

app.notFound((c) => c.json({ error: "Not found" }, 404));

export default app;
