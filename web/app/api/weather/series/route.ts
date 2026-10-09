import { NextRequest, NextResponse } from "next/server";
import { fetchSeries, toErrorResponse } from "@/lib/backend";

// "lat,lon;lat,lon" 形式の地点リスト。細かい検証(件数・範囲)はWorker側が行い、
// ここでは形式が明らかに違うものだけ弾く(Workerの400はそのまま転送される)。
const POINTS_PATTERN = /^-?\d+(\.\d+)?,-?\d+(\.\d+)?(;-?\d+(\.\d+)?,-?\d+(\.\d+)?)*$/;

export async function GET(req: NextRequest) {
  const points = new URL(req.url).searchParams.get("points");
  if (!points || !POINTS_PATTERN.test(points)) {
    return NextResponse.json(
      { error: 'pointsは"lat,lon;lat,lon"形式で指定してください' },
      { status: 400 },
    );
  }

  try {
    return NextResponse.json(await fetchSeries(points));
  } catch (err) {
    return toErrorResponse(err, "予報系列の取得に失敗しました");
  }
}
