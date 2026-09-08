import { NextRequest, NextResponse } from "next/server";
import { fetchHistoricalComparison, toErrorResponse } from "@/lib/backend";
import { parseLatLon } from "@/lib/validation";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const latlon = parseLatLon(searchParams.get("lat"), searchParams.get("lon"));

  if (!latlon) {
    return NextResponse.json({ error: "lat/lonは必須です" }, { status: 400 });
  }

  try {
    const data = await fetchHistoricalComparison(latlon.lat, latlon.lon);
    return NextResponse.json(data);
  } catch (err) {
    return toErrorResponse(err, "過去データの取得に失敗しました");
  }
}
