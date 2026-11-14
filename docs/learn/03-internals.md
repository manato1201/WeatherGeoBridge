# 3. 内側のしくみ

講義(第 1・2 回)で扱った「判断の境界値」「キャッシュの 2 つの期限」「`Number("")` の罠」「3 時間刻み」は、ここでは繰り返しません。ここでは、**講義に出ない部分**を読みます。

## 認証: 鍵が無いときは、閉じる

```typescript
// 抜粋ファイル: worker/src/auth.ts
const configured = c.env.WEATHERGEOBRIDGE_API_KEY;
if (!configured) {
  if (c.env.ALLOW_UNAUTHENTICATED === "true") {
    await next();
    return;
  }
  return c.json({ error: "サーバーの認証設定が未完了です。" }, 503);
}
```

- **fail-closed**: 以前は「鍵が未設定なら全許可」だった。`wrangler secret put` の**し忘れで本番が無認証**になりうるので、**既定は拒否**に変えた。鍵なしで動かしたいローカル開発だけ、`.dev.vars` に `ALLOW_UNAUTHENTICATED=true` を**明示**する。
- 比較は `safeEqual`: 両方を **SHA-256 にしてから全バイトを比べる**。文字列の長さや、どこまで一致したかが、**応答時間に出ない**。

## レート制限: 識別子は `X-Client-IP`

Worker は利用者のブラウザと**直接つながらない**(間に Next.js がいる)。Worker から見える IP は Next.js のサーバーのものなので、**利用者ごとの数え方**にするため、`web/lib/backend.ts` が `x-forwarded-for` の先頭を `X-Client-IP` として転送し、`rateLimit` がそれを鍵にします。

- 鍵を持つ呼び出し元しか、このヘッダーを付けられない(**鍵の保管が前提**)。
- バインディング `RATE_LIMITER` が無い環境(ローカル)では、何もしない。
- 超えたら **429 と `Retry-After: 60`**。

## CORS: 許可リスト方式

`ALLOWED_ORIGINS` に書いたオリジンだけを返し、**未設定なら全拒否**(以前は `"*"`)。ブラウザは通常 Next.js の API ルート経由で呼ぶので CORS 自体が要らず、**直接呼ぶ自サイトのオリジンだけ**を許す。

## エラーの変換

Open-Meteo が **4xx** を返したときは、**座標など呼び出し側の入力不備**なので **400**。それ以外(5xx・接続失敗)は **502**。`WeatherClientError.status` で見分ける(`weather.ts`)。

## キャッシュの補足

- **観測**(`/api/weather`)は `cache.ts`。**系列・メッシュ**(`/series`・`/grid`)は `series.ts` で、**別のキー**(`series:<SHA-256>`)・**別の期限**(新鮮 30 分・保存 2 時間)。
- 系列のキーは、座標を**小数 2 桁に丸めた文字列を `;` でつないだもの**の SHA-256。**地点の順番が違えば別のキー**になる。
- `/forecast`・`/air-quality`・`/history` は、**キャッシュしない**(毎回 Open-Meteo を呼ぶ)。
- KV の書き込みは、`ctx.waitUntil` で**応答のあと**にやる(待たせない)。

## 通知: 事実(差分)と、条件(購読者ごと)を分ける

```typescript
// 抜粋ファイル: worker/src/alerts.ts
export function computeDiff(previous: WeatherObservation | null, current: WeatherObservation): WeatherDiff | null {
  if (!previous) return null;
  return {
    precipitationStarted: previous.precipitationMm === 0 && current.precipitationMm > 0,
```

- `computeDiff` は**事実**だけ(降り始めたか・気温の差)。**初回(直前値なし)は `null`** で、通知は出ない。
- `buildAlerts` が、購読者ごとの条件(降水通知の有無・**気温の急変の閾値**、既定 5.0℃)で**通知を組み立てる**。同じ差でも、人によって届く通知が違う。
- 降水は「**前回 0 mm で、今回 > 0 mm**」の瞬間だけ(降り続けている間は出ない)。気温は絶対値が閾値以上なら、**上昇でも下降でも**。

### 定期ジョブ: 地点ごとに 1 回だけ取得する

```typescript
// 抜粋ファイル: worker/src/scheduled.ts
if (!sub.location) continue;
const key = roundKey(sub.location.lat, sub.location.lon);
```

- 購読者を、**丸めた地点のキーでまとめる**。同じ地点の購読者が 100 人でも、Open-Meteo への取得は **1 回**。
- **地点が無い古い購読**は、何を見ればよいか分からないのでスキップ。
- 地点ごとの処理は `Promise.allSettled` で**独立**に走る(1 地点の失敗で、他を止めない)。失敗は `console.error`。
- **画面の閲覧を、通知のきっかけにしない**(過去に「誰かが東京を開くと、大阪の購読者に東京の通知が飛ぶ」不具合があった)。

### 送信と掃除

`push.ts` は、購読者ごとに並列で送る。**404・410**(購読が無効)が返ったら、その購読を **1 回だけ**削除する。送信できる endpoint は、**主要ブラウザのプッシュサービスのホストだけ**(`isAllowedPushEndpoint`): 任意の URL を受け付けると、Worker に**任意のホストへ署名つきの POST**をさせられるため。

## 判断ルール(MCP)

講義の復習は最小限に、**追加の事実**だけ。

- `server.py` のツールは、`/api/weather/forecast`(`days=1`)と `/api/weather` を**2 回呼んで**、`DECIDERS[...]` に渡す。ルール自体は通信しない。
- **`hours` の範囲(1〜24)は、Worker を呼ぶ前に** `_check_hours` で確かめる(不正な入力で外部呼び出しを無駄にしない)。
- 401 は `PermissionError`、それ以外の HTTP エラー・接続失敗は `WorkerError`(`status_code` つき)。**4xx は直して再試行・5xx はリトライ**、と呼び出し側が分けられる。
- Cloudflare のボット対策が、既定の `Python-urllib` の User-Agent を**遮断する**(HTTP 403・error 1010)ので、固有の User-Agent を送っている。

データが欠けたときの倒し方は、**傘と洗濯で違います**(次の例)。

```python
# 実行できる
from mcp_server.decisions import decide_laundry, decide_umbrella

hourly = [{"time": "2026-10-09T12:00", "precipitationProbabilityPercent": None}]
print("傘(確率なし・降っていない):", decide_umbrella(hourly, 0)["answer"])
print("傘(確率なし・いま降っている):", decide_umbrella(hourly, 0.5)["answer"])
print("洗濯(確率なし):", decide_laundry(hourly, 0, 50)["answer"])

dry = [{"time": "2026-10-09T12:00", "precipitationProbabilityPercent": 0}]
print("洗濯(湿度 None):", decide_laundry(dry, 0, None)["answer"])
print("洗濯(湿度 86):", decide_laundry(dry, 0, 86)["answer"])
```

```text
# 出力
傘(確率なし・降っていない): unknown
傘(確率なし・いま降っている): yes
洗濯(確率なし): unknown
洗濯(湿度 None): yes
洗濯(湿度 86): no
```

- **傘**: 確率が取れなくても、**いま降っていれば `yes`**(観測を信じる)。降水確率そのものは、予報値のまま(観測で上書きしない)。
- **洗濯**: 確率が取れなければ `unknown`。**湿度が `None` のときは、湿度の条件を無視して `yes` になりうる**(→ [既知の問題](06-troubleshooting-maintenance.md))。
