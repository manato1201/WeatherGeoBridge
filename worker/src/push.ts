// Web Push送信・購読管理(notifications/push_sender.py + subscriptions_store.py からの移植)。
// Node依存のcrypto(pywebpush/web-push)ではなく、WebCrypto APIのみで動く
// @mmmike/web-push を使う(Cloudflare Workers公式対応)。

import { sendPushNotification } from "@mmmike/web-push/send";
import type { Alert } from "./alerts";
import type { Env } from "./types";
import type { PushSubscriptionInput } from "./validate";

const SUBSCRIPTION_PREFIX = "push:";

async function subscriptionKey(endpoint: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(endpoint));
  const hex = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${SUBSCRIPTION_PREFIX}${hex}`;
}

export async function addSubscription(env: Env, subscription: PushSubscriptionInput): Promise<void> {
  const key = await subscriptionKey(subscription.endpoint);
  await env.PUSH_SUBSCRIPTIONS.put(key, JSON.stringify(subscription));
}

async function listSubscriptions(env: Env): Promise<PushSubscriptionInput[]> {
  const results: PushSubscriptionInput[] = [];
  let cursor: string | undefined;
  do {
    const page = await env.PUSH_SUBSCRIPTIONS.list({ prefix: SUBSCRIPTION_PREFIX, cursor });
    // KV読み出しをページ内で並列化(逐次だと購読者が多いほど無駄に遅くなる)。
    const values = await Promise.all(page.keys.map((key) => env.PUSH_SUBSCRIPTIONS.get(key.name)));
    for (const value of values) {
      if (!value) continue;
      try {
        results.push(JSON.parse(value));
      } catch {
        // 破損したレコードはスキップする(送信全体を止めない)。
        console.warn("[push] 購読レコードのJSONが不正なためスキップしました。");
      }
    }
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  return results;
}

export async function sendAlertsToAllSubscriptions(env: Env, alerts: Alert[]): Promise<void> {
  if (alerts.length === 0) return;

  if (!env.VAPID_PRIVATE_KEY) {
    console.warn("[push] VAPID_PRIVATE_KEY未設定のため通知をスキップしました。");
    return;
  }

  const subscriptions = await listSubscriptions(env);
  if (subscriptions.length === 0) return;

  const vapid = {
    publicKey: env.VAPID_PUBLIC_KEY,
    privateKey: env.VAPID_PRIVATE_KEY,
    subject: env.VAPID_SUBJECT || "mailto:example@example.com",
  };

  // 購読者ごとに並列送信する(直列だと購読者×アラート数だけ待つことになり、
  // 大人数に対してWorkerのバックグラウンド実行時間を圧迫しかねない)。
  const deadEndpoints = new Set<string>();

  await Promise.allSettled(
    subscriptions.map(async (subscription) => {
      for (const alert of alerts) {
        try {
          await sendPushNotification(subscription, { title: alert.title, body: alert.body }, vapid);
        } catch (err: any) {
          const status = err?.statusCode ?? err?.status;
          if (status === 404 || status === 410) {
            deadEndpoints.add(subscription.endpoint);
            break; // 無効確定した購読には残りのアラートを送らない
          }
          console.error("[push] 送信失敗:", err);
        }
      }
    }),
  );

  // 削除は購読ごとに1回だけ(複数アラートで同じ無効購読を重複削除しない)。
  await Promise.all(
    [...deadEndpoints].map(async (endpoint) => {
      const key = await subscriptionKey(endpoint);
      await env.PUSH_SUBSCRIPTIONS.delete(key);
    }),
  );
}
