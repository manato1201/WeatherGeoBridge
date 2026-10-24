// X-API-Keyヘッダ認証(server/auth.py からの移植)。
// DevelopmentRAGEnvironment/scripts/rag_local_bridge.py が確立した準標準パターンを踏襲する。

import type { MiddlewareHandler } from "hono";
import type { Env } from "./types";

const encoder = new TextEncoder();

// 文字列の長さや一致位置が応答時間に出ないよう、両方をSHA-256にしてから全バイトを比較する。
async function safeEqual(a: string, b: string): Promise<boolean> {
  const [da, db] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(a)),
    crypto.subtle.digest("SHA-256", encoder.encode(b)),
  ]);
  const va = new Uint8Array(da);
  const vb = new Uint8Array(db);
  let diff = 0;
  for (let i = 0; i < va.length; i++) diff |= va[i] ^ vb[i];
  return diff === 0;
}

export const requireApiKey: MiddlewareHandler<{ Bindings: Env }> = async (c, next) => {
  const configured = c.env.WEATHERGEOBRIDGE_API_KEY;
  if (!configured) {
    // 以前は「鍵が未設定なら全許可(開発モード)」だった。wrangler secret put のし忘れで
    // 本番が無認証になりうるため、既定は拒否(fail-closed)にした。ローカル開発で鍵なしに
    // したいときだけ、.dev.vars に ALLOW_UNAUTHENTICATED=true を明示する。
    if (c.env.ALLOW_UNAUTHENTICATED === "true") {
      console.warn("[auth] ALLOW_UNAUTHENTICATED=true のため認証なしで動作しています(開発用)。");
      await next();
      return;
    }
    console.error(
      "[auth] WEATHERGEOBRIDGE_API_KEY未設定のためリクエストを拒否しました。wrangler secret putで設定してください。",
    );
    return c.json({ error: "サーバーの認証設定が未完了です。" }, 503);
  }

  const apiKey = c.req.header("X-API-Key") ?? "";
  if (!(await safeEqual(apiKey, configured))) {
    return c.json({ error: "認証が必要です。X-API-Keyヘッダーを設定してください。" }, 401);
  }
  await next();
};

// 呼び出し頻度の上限(Workersのレート制限バインディング RATE_LIMITER)。
// 認証のあとに置き、呼び出し元の識別には、Next.jsのAPI Routeが転送する X-Client-IP
// (利用者のIP)を使う。鍵を持つ呼び出し元だけが付けられるヘッダなので、なりすませない
// のは鍵の保管が前提。バインディング未設定(ローカルなど)のときは何もしない。
export const rateLimit: MiddlewareHandler<{ Bindings: Env }> = async (c, next) => {
  const limiter = c.env.RATE_LIMITER;
  if (!limiter) {
    await next();
    return;
  }
  const client =
    c.req.header("X-Client-IP") || c.req.header("CF-Connecting-IP") || "unknown";
  const { success } = await limiter.limit({ key: client.slice(0, 64) });
  if (!success) {
    c.header("Retry-After", "60");
    return c.json({ error: "リクエストが多すぎます。しばらく待ってからやり直してください。" }, 429);
  }
  await next();
};
