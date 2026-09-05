// クエリパラメータのバリデーション。
//
// Number("") は 0 になり NaN にならないため、Number.isNaN(Number(raw)) だけの
// チェックでは空文字列のlat/lonが検証をすり抜けて(0, 0)相当として扱われてしまう。
// 値の存在チェックと範囲チェックを両方行う。

export interface LatLon {
  lat: number;
  lon: number;
}

export function parseLatLon(
  latRaw: string | undefined,
  lonRaw: string | undefined,
): LatLon | null {
  if (!latRaw || !lonRaw) return null;
  const lat = Number(latRaw);
  const lon = Number(lonRaw);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
  return { lat, lon };
}

export function parseDays(
  raw: string | undefined,
  fallback: number,
): number | null {
  if (raw === undefined) return fallback;
  const days = Number(raw);
  if (!Number.isFinite(days)) return null;
  if (days < 1 || days > 16) return null;
  return Math.trunc(days);
}

export interface PushSubscriptionInput {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  [key: string]: unknown;
}

export function parsePushSubscription(
  body: unknown,
): PushSubscriptionInput | null {
  if (typeof body !== "object" || body === null) return null;
  const b = body as Record<string, unknown>;
  if (typeof b.endpoint !== "string" || !b.endpoint) return null;
  const keys = b.keys;
  if (typeof keys !== "object" || keys === null) return null;
  const k = keys as Record<string, unknown>;
  if (typeof k.p256dh !== "string" || !k.p256dh) return null;
  if (typeof k.auth !== "string" || !k.auth) return null;
  return {
    ...b,
    endpoint: b.endpoint,
    keys: { p256dh: k.p256dh, auth: k.auth },
  } as PushSubscriptionInput;
}
