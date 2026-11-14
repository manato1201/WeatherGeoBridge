# WeatherGeoBridge 学習資料(保守・拡張の実務編)

このフォルダは、**この API・MCP・ダッシュボードを直す・足す人**のための資料です。基礎から順に学ぶ講義は [../lecture/index.md](../lecture/index.md)(第 0〜2 回)。公開 URL・セットアップ・運用の詳細(旧 README)は [setup-and-operations.md](../reference/setup-and-operations.md)。

| # | 資料 | いつ読むか |
|---|---|---|
| 1 | [全体像](01-overview.md) | 部品・エンドポイント・データの置き場所・設定値 |
| 2 | [コードの読み方](02-code-tour.md) | どのファイルから読むか・1 リクエストの流れ |
| 3 | [内側のしくみ](03-internals.md) | 認証・CORS・キャッシュ・間引き・通知・判断ルール |
| 4 | [拡張のレシピ](04-extend.md) | エンドポイント・判断・通知の条件・MCP ツールを**足したい** |
| 5 | [テストの書き方と実行](05-testing.md) | テストを回す・足す・文書の検査・**確かめていないこと** |
| 6 | [トラブルと保守](06-troubleshooting-maintenance.md) | 動かない・**既知の問題**・定期の保守 |
| – | [用語集](glossary.md) | 分からない言葉が出た |

## 最初の 15 分

1. [講義 第 0 回](../lecture/00-introduction.md)で、構成(ブラウザ → Next.js → Worker → Open-Meteo)を見る。
2. `python -m unittest mcp_server.test_decisions` を実行して、判断ルールのテストが通ることを確かめる。
3. [構成図](../diagrams/architecture.svg)を見ながら、[全体像](01-overview.md)を読む。

## コードの地図(早見表)

| 場所 | 役割 |
|---|---|
| `worker/src/index.ts`(約 180 行) | Hono のルート。認証・レート制限・入力の検証・エラーの変換 |
| `worker/src/weather.ts` | Open-Meteo の取得・正規化 |
| `worker/src/cache.ts` | KV のキャッシュ(使える 10 分・保存 7 日)・`refreshAndDiff` |
| `worker/src/series.ts` | 複数地点の +72 時間・3 時間刻みの系列、メッシュ |
| `worker/src/validate.ts` | 入力の検証(緯度経度・日数・地点リスト・メッシュ・購読) |
| `worker/src/alerts.ts`・`push.ts`・`scheduled.ts` | 差分の判定・Web Push・定期ジョブ |
| `worker/src/auth.ts` | `X-API-Key` の検査・呼び出し頻度の上限 |
| `mcp_server/decisions.py` | 判断ルール(純粋関数)と `DECIDERS` |
| `mcp_server/server.py` | MCP のツール(Worker を呼ぶだけ) |
| `web/` | Next.js(ダッシュボード・天気アトラス)。API ルートが、キーを付けて Worker を呼ぶ |
