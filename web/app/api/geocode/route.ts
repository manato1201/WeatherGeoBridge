import { NextRequest, NextResponse } from "next/server";

// Open-Meteo Geocoding API(認証不要・公開API)。ローマ字/英語の地名検索のみ
// 対応しており、日本語(漢字・かな)では結果が返らないことが多い。日本の主要
// 都市は web/lib/japanCities.ts の固定リストで別途カバーする。
const GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";

export async function GET(req: NextRequest) {
  const q = new URL(req.url).searchParams.get("q")?.trim();
  if (!q) {
    return NextResponse.json({ results: [] });
  }

  const url = new URL(GEOCODING_URL);
  url.searchParams.set("name", q);
  url.searchParams.set("count", "8");
  url.searchParams.set("language", "ja");
  url.searchParams.set("format", "json");

  try {
    const res = await fetch(url.toString(), { cache: "no-store" });
    if (!res.ok) {
      return NextResponse.json({ results: [] });
    }
    const data = await res.json();
    const results = (data.results ?? []).map((r: any) => ({
      name: r.name as string,
      admin1: (r.admin1 as string | undefined) ?? null,
      country: (r.country as string | undefined) ?? null,
      lat: r.latitude as number,
      lon: r.longitude as number,
    }));
    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ results: [] });
  }
}
