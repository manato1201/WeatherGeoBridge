import { NextRequest, NextResponse } from "next/server";
import { BackendError, submitPushSubscription } from "@/lib/backend";

export async function POST(req: NextRequest) {
  const subscription = await req.json();

  try {
    await submitPushSubscription(subscription);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    if (err instanceof BackendError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "購読登録に失敗しました" },
      { status: 502 },
    );
  }
}
