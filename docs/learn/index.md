# WeatherGeoBridge 学習資料(簡易版)

保守・拡張の詳しい資料は**未作成**です。基礎は [講義](../lecture/index.md)(第 0〜2 回)。旧 README(セットアップ・API・運用の詳細)は [setup-and-operations.md](../reference/setup-and-operations.md)。

## コードの地図

| 場所 | 役割 |
|---|---|
| `worker/src/index.ts`(約 180 行) | Hono のルート(`/api/weather`・`/forecast`・`/history`・`/series`・`/grid`・`/air-quality`・`/push/subscribe`) |
| `worker/src/weather.ts` | Open-Meteo の取得・正規化 |
| `worker/src/cache.ts` | KV のキャッシュ(使える 10 分・保存 7 日)・`refreshAndDiff` |
| `worker/src/series.ts` | 複数地点の +72 時間・3 時間刻みの系列、メッシュ |
| `worker/src/validate.ts` | 入力の検証(緯度経度・日数・地点リスト・メッシュ) |
| `worker/src/alerts.ts`・`push.ts`・`scheduled.ts` | 差分の判定・Web Push・定期ジョブ |
| `worker/src/auth.ts` | `X-API-Key` の検査 |
| `mcp_server/decisions.py` | 判断ルール(純粋関数)と `DECIDERS` |
| `mcp_server/server.py` | MCP のツール(Worker を呼ぶだけ) |
| `web/` | Next.js(ダッシュボード・天気アトラス)。API ルートが、キーを付けて Worker を呼ぶ |

テスト: `python -m unittest mcp_server.test_decisions`(判断の境界値)。

## 既知の問題・注意(講義の作成中に読んで見つけたもの。コードは変えていない)

1. **MCP のツールは、`api_key` を引数で受け取る**(`server.py`)。引数は **AI モデルとやりとりの記録に載る**ので、キーが**モデルの入力・ログに残りうる**。キーは、サーバーの環境変数で持つ(ツールの引数にしない)形が安全。
2. **湿度が分からない(`None`)とき、洗濯の判定は湿度を無視する**(`yes` になりうる)。データが欠けたときの倒し方は、設計の判断で、`unknown` に倒す案もある。
3. **キャッシュのキーは小数 2 桁(約 1 km)**。同じ格子の別の地点は、同じ観測を共有する(返すときは要求座標に差し替える)。
4. Worker の TypeScript は、このリポジトリのテストでは**未実行**(Cloudflare の環境が要る)。`web/` のテストも、ここでは確かめていない。
5. 旧 README にある**公開 URL**・ワーカーの名前は、運用の情報(書き換えるときは、旧 README を直す)。
