// X-API-Keyヘッダ認証(server/auth.py からの移植)。
// DevelopmentRAGEnvironment/scripts/rag_local_bridge.py が確立した準標準パターンを踏襲する。

import type { MiddlewareHandler } from "hono";
import type { Env } from "./types";

export const requireApiKey: MiddlewareHandler<{ Bindings: Env }> = async (c, next) => {
  const configured = c.env.WEATHERGEOBRIDGE_API_KEY;
  if (configured) {
    const apiKey = c.req.header("X-API-Key") ?? "";
    if (apiKey !== configured) {
      return c.json({ error: "認証が必要です。X-API-Keyヘッダーを設定してください。" }, 401);
    }
  }
  await next();
};
