// 定期実行(Cronトリガー)による、購読者ごとの地点に絞った天気変化通知。
//
// 以前は「誰かがどこかの地点をアプリで閲覧してキャッシュミスが発生した」ことを
// 全購読者へのPush通知のきっかけにしていたため、無関係な地点の変化が全員に
// 届いてしまう不具合があった(例: 大阪の購読者が東京の気温急変通知を受け取る)。
// この定期ジョブは、購読時にサブスクリプションへ保存した「購読者自身の地点」
// ごとにグループ化し、その地点の変化だけをその地点の購読者にだけ届ける。
//
// 同じ地点(丸めキー単位)を複数人が購読していても、Open-Meteoへの問い合わせは
// 地点ごとに1回だけで済む。

import { refreshAndDiff, roundKey } from "./cache";
import { listSubscriptions, sendDiffToSubscriptions } from "./push";
import type { Env } from "./types";
import type { PushSubscriptionInput } from "./validate";

interface LocationGroup {
  lat: number;
  lon: number;
  subscriptions: PushSubscriptionInput[];
}

export async function runScheduledAlertCheck(env: Env): Promise<void> {
  const subscriptions = await listSubscriptions(env);
  if (subscriptions.length === 0) return;

  const groups = new Map<string, LocationGroup>();
  for (const sub of subscriptions) {
    // 地点未保存の古い購読レコード(この機能追加より前に作られたもの)は、
    // どの地点を監視すべきか判断できないためスキップする。
    if (!sub.location) continue;
    const key = roundKey(sub.location.lat, sub.location.lon);
    const existing = groups.get(key);
    if (existing) {
      existing.subscriptions.push(sub);
    } else {
      groups.set(key, {
        lat: sub.location.lat,
        lon: sub.location.lon,
        subscriptions: [sub],
      });
    }
  }

  await Promise.allSettled(
    [...groups.values()].map(async ({ lat, lon, subscriptions: subs }) => {
      try {
        const diff = await refreshAndDiff(env, lat, lon);
        if (diff) {
          await sendDiffToSubscriptions(env, diff, subs);
        }
      } catch (err) {
        console.error(
          `[scheduled] (${lat}, ${lon}) の判定に失敗しました:`,
          err,
        );
      }
    }),
  );
}
