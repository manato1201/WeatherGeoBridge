# 第 2 回 Worker の設計(キャッシュ・入力の検証・間引き)

> 所要時間の目安: 3 時間 / 前提: 第 0〜1 回・TypeScript の基本

TypeScript のコードは、この文書では**実行しません**(Cloudflare の環境が要るため)。コードの**抜粋**が、実際のソースと一致しているかだけを、`tests/test_docs.py` が確かめます。

## この回のゴール

- キャッシュの「**保存の期限**」と「**使える期限**」を分ける理由を説明できる。
- 入力検証の落とし穴(`Number("")` が `0` になる)を説明できる。
- 時間別の予報を **3 時間刻みに間引く**考え方を説明できる。

## 1. キャッシュ: 保存の期限と、使える期限

天気は、同じ地点を何度も聞かれます。**10 分間**は、前の結果を使い回します(Open-Meteo への問い合わせと、待ち時間を減らす)。

ところが、Cloudflare KV の `expirationTtl`(自動削除)を **10 分**にすると、**期限が切れた後の「直前の値」まで消えます**。通知(前回との**差分**で出す)には、直前の値が要ります。

```typescript
// 抜粋ファイル: worker/src/cache.ts
const TTL_SECONDS = 600;
const KV_ENTRY_EXPIRATION_SECONDS = 60 * 60 * 24 * 7;
if (KV_ENTRY_EXPIRATION_SECONDS <= TTL_SECONDS) {
  throw new Error("KV_ENTRY_EXPIRATION_SECONDS must be greater than TTL_SECONDS");
}
```

- **`TTL_SECONDS`(600)**: 結果を**使い回してよい**時間。`fetchedAt`(取得時刻)を見て、**自分で**判定する。
- **`KV_ENTRY_EXPIRATION_SECONDS`(7 日)**: KV が**値を捨てる**時間。ただの掃除。**必ず前者より長く**する。
- **起動時に検証**(前者 ≤ 後者なら例外): 設定を直し間違えて、通知が静かに止まる事故を、**起動の時点で**止める(fail-fast)。

```typescript
// 抜粋ファイル: worker/src/cache.ts
export function roundKey(lat: number, lon: number): string {
  return `weather:${lat.toFixed(2)},${lon.toFixed(2)}`;
}
```

キーは**緯度経度を小数 2 桁に丸めた**もの(約 1 km の格子)。近い地点を**同じキャッシュ**にまとめます。ただし、返すときは、**要求された座標**に差し替えます(丸めた座標ではなく)。

**通知の判定を、画面の閲覧に結びつけない**: 以前は「誰かがこの地点を開いてキャッシュが外れた」ことを、全購読者への通知のきっかけにしていて、**興味のない地点の通知が全員に飛ぶ**不具合がありました。いまは、**定期ジョブ**(`scheduled.ts`)が、購読者ごとの地点だけを調べます。

## 2. 入力の検証: `Number("")` の罠

```typescript
// 抜粋ファイル: worker/src/validate.ts
export function parseLatLon(
  latRaw: string | undefined,
  lonRaw: string | undefined,
): LatLon | null {
  if (!latRaw || !lonRaw) return null;
  const lat = Number(latRaw);
  const lon = Number(lonRaw);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
  return { lat, lon };
}
```

JavaScript では、`Number("")` は **`NaN` でなく `0`** です。`Number.isNaN(Number(raw))` だけで検査すると、**空の `lat=` が、緯度 0(赤道)として通ってしまいます**。そこで、①**値の存在**(`!latRaw`)②**有限の数**(`Number.isFinite`)③**範囲**、の 3 つを順に確かめます。

- 範囲は、緯度 −90〜90・経度 −180〜180。
- 複数地点(`points=lat,lon;lat,lon`)は、**最大 40 件**(`MAX_SERIES_POINTS`)。余分な `,` があれば不正。
- **外から来る値は、入口で検証する**(後ろの処理に、壊れた値を通さない)。

## 3. 時間スライダーの 3 時間刻み

アトラスの時間スライダーは、**いまから +72 時間を 3 時間刻み**(25 点)で動かします。Open-Meteo は**1 時間刻み**で返すので、間引きます。

```typescript
// 抜粋ファイル: worker/src/series.ts
export const STEP_HOURS = 3;
export const STEP_COUNT = 25; // 0, 3, ..., 72時間先
export function pickStepIndices(times: string[], now: Date): number[] {
  const start = Math.max(0, times.indexOf(jstFloorHourKey(now)));
```

- **現在時刻の属する時**(日本時間の切り捨て)から数え始める。見つからなければ先頭(0)。
- **複数地点を 1 回の問い合わせ**にまとめる(`latitude=a,b,c&longitude=x,y,z`)。地点ごとに叩かない。
- 現在が 23 時台でも +72 時間をカバーするため、**4 日分**取得する。

## 確認問題

1. KV の自動削除を、使える期限(10 分)と同じにすると、何が困りますか。
2. `Number("")` が `0` になると、検証をすり抜けるのは、なぜですか。
3. キャッシュのキーを、小数 2 桁に丸めるのは、なぜですか。
4. 複数地点を、1 回の問い合わせにまとめる利点は。

## 解答

1. 期限の後に**直前の値が消え**、前回との差分(通知の判定)が取れなくなる。
2. 空文字を、`isNaN` は「数ではない」と判定せず(`0` になる)、赤道の座標として扱われるから。存在・有限・範囲を、別々に確かめる。
3. 近い地点を、同じキャッシュにまとめ、**問い合わせの数を減らす**ため。
4. Open-Meteo への通信が**1 回**で済み、速く、呼び出しの回数制限にも優しい。

## まとめ

- キャッシュは、**使える期限**(`fetchedAt` で判定)と**保存の期限**(掃除)を分ける。後者は**必ず長く**し、起動時に検証する。
- 入力は**入口で検証**する。`Number("")` の罠に注意。
- 時間別の予報は、**3 時間刻みに間引き**、複数地点は**まとめて**問い合わせる。
- ここから先は、[学習資料](../learn/index.md)へ。
