import { NextRequest, NextResponse } from "next/server";
import { submitPushSubscription, toErrorResponse } from "@/lib/backend";

export async function POST(req: NextRequest) {
  let subscription: unknown;
  try {
    subscription = await req.json();
  } catch {
    return NextResponse.json({ error: "リクエストボディが不正なJSONです" }, { status: 400 });
  }

  try {
    await submitPushSubscription(subscription);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    return toErrorResponse(err, "購読登録に失敗しました");
  }
}
