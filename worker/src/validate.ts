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

import { DEFAULT_PREFERENCES } from "./alerts";
import type { NotificationPreferences } from "./types";

export interface SubscriptionLocation {
  lat: number;
  lon: number;
}

export interface PushSubscriptionInput {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  preferences: NotificationPreferences;
  // 通知はこの地点の変化だけを対象に判定する(以前は「誰かがどこかの地点を
  // 閲覧した」ことをきっかけに全購読者へ通知していたため、無関係な地点の
  // 変化が届いてしまう不具合があった)。
  location: SubscriptionLocation;
  [key: string]: unknown;
}

function parseLocation(raw: unknown): SubscriptionLocation | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const lat = r.lat;
  const lon = r.lon;
  if (typeof lat !== "number" || typeof lon !== "number") return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
  return { lat, lon };
}

function parsePreferences(raw: unknown): NotificationPreferences {
  if (typeof raw !== "object" || raw === null)
    return { ...DEFAULT_PREFERENCES };
  const p = raw as Record<string, unknown>;
  const notifyPrecipitation =
    typeof p.notifyPrecipitation === "boolean"
      ? p.notifyPrecipitation
      : DEFAULT_PREFERENCES.notifyPrecipitation;
  const rawThreshold = p.temperatureSwingThresholdC;
  const temperatureSwingThresholdC =
    typeof rawThreshold === "number" &&
    Number.isFinite(rawThreshold) &&
    rawThreshold > 0
      ? rawThreshold
      : DEFAULT_PREFERENCES.temperatureSwingThresholdC;
  return { notifyPrecipitation, temperatureSwingThresholdC };
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
  const location = parseLocation(b.location);
  if (!location) return null;
  return {
    ...b,
    endpoint: b.endpoint,
    keys: { p256dh: k.p256dh, auth: k.auth },
    preferences: parsePreferences(b.preferences),
    location,
  } as PushSubscriptionInput;
}
