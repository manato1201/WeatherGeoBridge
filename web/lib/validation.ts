// クエリパラメータのバリデーション(worker/src/validate.ts と同じ考え方)。
//
// `Number(null)` と `Number("")` はどちらも 0 になり NaN にならないため、
// lat/lonが未指定・空文字のリクエストが「緯度経度0(ギニア湾)」として
// すり抜けてしまう。値の存在チェックを先に行う。

export interface LatLon {
  lat: number;
  lon: number;
}

export function parseLatLon(
  latRaw: string | null,
  lonRaw: string | null,
): LatLon | null {
  if (!latRaw || !lonRaw) return null;
  const lat = Number(latRaw);
  const lon = Number(lonRaw);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
  return { lat, lon };
}
