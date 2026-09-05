import { NextResponse } from "next/server";
import { fetchVapidPublicKey } from "@/lib/backend";

export async function GET() {
  try {
    const data = await fetchVapidPublicKey();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ publicKey: "" }, { status: 502 });
  }
}
