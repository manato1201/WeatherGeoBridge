// X-API-Keyヘッダ認証(server/auth.py からの移植)。
// DevelopmentRAGEnvironment/scripts/rag_local_bridge.py が確立した準標準パターンを踏襲する。

import type { MiddlewareHandler } from "hono";
import type { Env } from "./types";

export const requireApiKey: MiddlewareHandler<{ Bindings: Env }> = async (c, next) => {
  const configured = c.env.WEATHERGEOBRIDGE_API_KEY;
  if (!configured) {
    // WEATHERGEOBRIDGE_API_KEY未設定=開発モード(全許可)。本番で意図せずこの
    // 状態になっている(wrangler secret putのし忘れ等)ことに気付けるよう、
    // 気付かれないまま無認証運用が続かないように毎回ログへ警告を出す。
    console.warn(
      "[auth] WEATHERGEOBRIDGE_API_KEY未設定のため認証なしで動作しています。本番運用ではwrangler secret putで設定してください。",
    );
    await next();
    return;
  }

  const apiKey = c.req.header("X-API-Key") ?? "";
  if (apiKey !== configured) {
    return c.json({ error: "認証が必要です。X-API-Keyヘッダーを設定してください。" }, 401);
  }
  await next();
};
