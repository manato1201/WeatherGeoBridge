import { NextRequest, NextResponse } from "next/server";
import { fetchGrid, toErrorResponse } from "@/lib/backend";
import { parseLatLon } from "@/lib/validation";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const latlon = parseLatLon(searchParams.get("lat"), searchParams.get("lon"));
  if (!latlon) {
    return NextResponse.json({ error: "lat/lonは必須です" }, { status: 400 });
  }

  const span = Number(searchParams.get("span") ?? 2.4);
  const n = Number(searchParams.get("n") ?? 8);
  if (!Number.isFinite(span) || span < 0.4 || span > 6) {
    return NextResponse.json({ error: "spanは0.4〜6で指定してください" }, { status: 400 });
  }
  if (!Number.isInteger(n) || n < 4 || n > 10) {
    return NextResponse.json({ error: "nは4〜10の整数で指定してください" }, { status: 400 });
  }

  try {
    return NextResponse.json(await fetchGrid(latlon.lat, latlon.lon, span, n));
  } catch (err) {
    return toErrorResponse(err, "メッシュ予報の取得に失敗しました");
  }
}
