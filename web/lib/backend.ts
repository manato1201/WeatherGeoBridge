// Next.js API RouteからCloudflare Worker(worker/)を叩くserver-sideヘルパー。
// WEATHERGEOBRIDGE_API_KEYはここでのみ扱い、ブラウザには絶対に渡さない。

import { NextResponse } from "next/server";

// Worker側のローカル開発は `wrangler dev --port 8788`(README参照)なので、
// 未設定時のデフォルトもそれに合わせる。
const BASE_URL = process.env.WEATHERGEOBRIDGE_API_BASE_URL ?? "http://localhost:8788";
const API_KEY = process.env.WEATHERGEOBRIDGE_API_KEY ?? "";

export class BackendError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function backendFetch(path: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      "X-API-Key": API_KEY,
    },
    cache: "no-store",
  });
  if (!res.ok) {
    // Workerのエラーレスポンスは常に {"error": "..."} 形式のJSON。生のJSON文字列
    // をそのままメッセージにすると、フロント側でエスケープされたJSONがそのまま
    // ユーザーに表示されてしまうため、必ずerrorフィールドを取り出す。
    const bodyText = await res.text();
    let message = bodyText || `backend responded with ${res.status}`;
    try {
      const parsed = JSON.parse(bodyText);
      if (parsed && typeof parsed.error === "string") {
        message = parsed.error;
      }
    } catch {
      // JSONでなければ生テキストのまま使う。
    }
    throw new BackendError(res.status, message);
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

// Next.js API Route側の共通catchハンドラ。BackendErrorはWorkerが返した
// ステータス/メッセージをそのまま転送し、それ以外(接続失敗等)は502にする。
export function toErrorResponse(err: unknown, fallbackMessage: string): NextResponse {
  if (err instanceof BackendError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  return NextResponse.json({ error: fallbackMessage }, { status: 502 });
}
