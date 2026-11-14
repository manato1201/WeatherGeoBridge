# 2. コードの読み方

## どこから読むか(おすすめの順)

| 順 | ファイル | 見るところ |
|---|---|---|
| 1 | `worker/src/index.ts` | 全ルートが並ぶ。**どのルートも「検証 → 取得 → 返す」の同じ形** |
| 2 | `worker/src/validate.ts` | 入口の検証。短いので先に読む |
| 3 | `worker/src/auth.ts` | 認証とレート制限(ミドルウェア) |
| 4 | `worker/src/cache.ts` | キャッシュの 2 つの期限・`roundKey`・`refreshAndDiff` |
| 5 | `worker/src/alerts.ts` → `scheduled.ts` → `push.ts` | 通知: 差分 → 購読者ごとの条件 → 送信 |
| 6 | `worker/src/series.ts` | 間引きとメッシュ |
| 7 | `mcp_server/decisions.py` → `server.py` | 判断ルール(純粋関数)→ それを呼ぶ MCP ツール |
| 8 | `web/lib/backend.ts` | Next.js が、キーと利用者の IP を付けて Worker を呼ぶ |

`weather.ts` は、Open-Meteo のレスポンスの**名前の読み替え**(`temperature_2m` → `temperatureC`)が大半。困ったときに開けば足ります。

## 1 つのリクエストの流れ(`GET /api/weather`)

1. **CORS**(`index.ts` の最初のミドルウェア): `ALLOWED_ORIGINS` にあるオリジンだけ許可。
2. **`requireApiKey`**: 鍵が未設定なら 503・`X-API-Key` が違えば 401。
3. **`rateLimit`**: `X-Client-IP`(無ければ `CF-Connecting-IP`)ごとに 1 分 60 回。超えたら 429。
4. **`parseLatLon`**: 空・非数・範囲外なら 400。
5. **`getOrFetchWeather`**: 丸めたキーで KV を見る。10 分以内なら**返す**(座標は要求のものに差し替え)。無ければ Open-Meteo を取得し、**応答を返したあとで**(`waitUntil`)KV に保存。
6. 失敗したら `weatherErrorResponse`: Open-Meteo が 4xx → **400**(入力不備)・それ以外 → **502**(上流障害)。

## 1 回の定期ジョブ(15 分ごと)

`scheduled`(`index.ts` の末尾)→ `runScheduledAlertCheck`(`scheduled.ts`)→ 購読者を**地点ごとにまとめる** → 地点ごとに `refreshAndDiff`(最新を取得・直前値との差を計算・キャッシュ更新)→ 差があれば `sendDiffToSubscriptions`(購読者ごとの条件で `buildAlerts` → 送信)。

## 流儀(このコードの約束)

- **失敗は、呼び出し側が分けられる形で返す**: 400(直せ)・401/503(認証)・429(待て)・502(上流)。`error` フィールドの JSON が共通。
- **コメントに「なぜ」を書く**(過去の不具合・設計の理由)。コードを足すときも、同じ粒度で書く。
- **判断ルールは純粋関数**(`decisions.py`)。通信するのは `server.py` だけ。
- **外から来る値は、入口(`validate.ts`)で全部検証する**。`index.ts` の中で `Number(...)` を直接使わない。
- **鍵はサーバー側だけ**。ブラウザ(`web/` のクライアント側)には渡さない。
