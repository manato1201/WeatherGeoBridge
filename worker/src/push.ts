// Web Push送信・購読管理(notifications/push_sender.py + subscriptions_store.py からの移植)。
// Node依存のcrypto(pywebpush/web-push)ではなく、WebCrypto APIのみで動く
// @mmmike/web-push を使う(Cloudflare Workers公式対応)。

import { sendPushNotification } from "@mmmike/web-push/send";
import type { Alert } from "./alerts";
import type { Env } from "./types";

const SUBSCRIPTION_PREFIX = "push:";

interface PushSubscriptionRecord {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  [key: string]: unknown;
}

async function subscriptionKey(endpoint: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(endpoint));
  const hex = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${SUBSCRIPTION_PREFIX}${hex}`;
}

export async function addSubscription(env: Env, subscription: PushSubscriptionRecord): Promise<void> {
  const key = await subscriptionKey(subscription.endpoint);
  await env.PUSH_SUBSCRIPTIONS.put(key, JSON.stringify(subscription));
}

async function listSubscriptions(env: Env): Promise<PushSubscriptionRecord[]> {
  const results: PushSubscriptionRecord[] = [];
  let cursor: string | undefined;
  do {
    const page = await env.PUSH_SUBSCRIPTIONS.list({ prefix: SUBSCRIPTION_PREFIX, cursor });
    for (const key of page.keys) {
      const value = await env.PUSH_SUBSCRIPTIONS.get(key.name);
      if (value) results.push(JSON.parse(value));
    }
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  return results;
}

export async function sendAlertsToAllSubscriptions(env: Env, alerts: Alert[]): Promise<void> {
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

  for (const alert of alerts) {
    for (const subscription of subscriptions) {
      try {
        await sendPushNotification(subscription, { title: alert.title, body: alert.body }, vapid);
      } catch (err: any) {
        const status = err?.statusCode ?? err?.status;
        if (status === 404 || status === 410) {
          const key = await subscriptionKey(subscription.endpoint);
          await env.PUSH_SUBSCRIPTIONS.delete(key);
        } else {
          console.error("[push] 送信失敗:", err);
        }
      }
    }
  }
}
