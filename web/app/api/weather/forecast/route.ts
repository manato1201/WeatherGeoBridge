import { NextRequest, NextResponse } from "next/server";
import { fetchForecast, toErrorResponse } from "@/lib/backend";
import { parseLatLon } from "@/lib/validation";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const latlon = parseLatLon(searchParams.get("lat"), searchParams.get("lon"));
  const daysRaw = searchParams.get("days");
  const days = daysRaw === null ? 3 : Number(daysRaw);

  if (!latlon) {
    return NextResponse.json({ error: "lat/lonは必須です" }, { status: 400 });
  }
  if (!Number.isFinite(days) || days < 1 || days > 16) {
    return NextResponse.json({ error: "daysは1〜16の整数で指定してください" }, { status: 400 });
  }

  try {
    const data = await fetchForecast(latlon.lat, latlon.lon, days);
    return NextResponse.json(data);
  } catch (err) {
    return toErrorResponse(err, "予報の取得に失敗しました");
  }
}
