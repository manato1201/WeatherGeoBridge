import { NextRequest, NextResponse } from "next/server";
import { BackendError, fetchForecast } from "@/lib/backend";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lat = Number(searchParams.get("lat"));
  const lon = Number(searchParams.get("lon"));
  const days = Number(searchParams.get("days") ?? "3");

  if (Number.isNaN(lat) || Number.isNaN(lon)) {
    return NextResponse.json({ error: "lat/lonは必須です" }, { status: 400 });
  }

  try {
    const data = await fetchForecast(lat, lon, days);
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof BackendError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "予報の取得に失敗しました" }, { status: 502 });
  }
}
