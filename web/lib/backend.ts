// Next.js API RouteからPython REST APIサーバー(server/api_server.py)を叩く
// server-sideヘルパー。WEATHERGEOBRIDGE_API_KEYはここでのみ扱い、
// ブラウザには絶対に渡さない。

const BASE_URL =
  process.env.WEATHERGEOBRIDGE_API_BASE_URL ?? "http://localhost:8787";
const API_KEY = process.env.WEATHERGEOBRIDGE_API_KEY ?? "";

export class BackendError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function backendFetch(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      "X-API-Key": API_KEY,
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text();
    throw new BackendError(
      res.status,
      body || `backend responded with ${res.status}`,
    );
  }
  return res;
}

export async function fetchWeather(lat: number, lon: number) {
  const res = await backendFetch(`/api/weather?lat=${lat}&lon=${lon}`);
  return res.json();
}

export async function fetchForecast(lat: number, lon: number, days = 3) {
  const res = await backendFetch(
    `/api/weather/forecast?lat=${lat}&lon=${lon}&days=${days}`,
  );
  return res.json();
}

export async function fetchVapidPublicKey() {
  const res = await backendFetch("/api/push/vapid-public-key");
  return res.json();
}

export async function submitPushSubscription(subscription: unknown) {
  await backendFetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(subscription),
  });
}
