# 6. トラブルと保守

## 症状から探す

| 症状 | 原因の候補 | 確かめ方・直し方 |
|---|---|---|
| **503**「サーバーの認証設定が未完了です」 | `WEATHERGEOBRIDGE_API_KEY` が未設定(fail-closed) | `wrangler secret put WEATHERGEOBRIDGE_API_KEY`。ローカルだけ `.dev.vars` に `ALLOW_UNAUTHENTICATED=true` |
| **401** | `X-API-Key` が違う・無い。Next.js 側の `WEATHERGEOBRIDGE_API_KEY` とずれている | 両方の値を揃える。MCP は `api_key` 引数を Worker へそのまま転送する |
| **429** | 利用者(`X-Client-IP`)ごとに 1 分 60 回を超えた | `Retry-After: 60`。IP が転送されていないと、全員が `unknown` で**1 つの枠を共有**する |
| **400**「lat/lonは必須です」 | 空・非数・範囲外 | `lat`・`lon` の値を見る(空文字は弾かれる) |
| **400** で、Open-Meteo のメッセージ | Open-Meteo が 4xx を返した(座標・日数など) | メッセージを読む |
| **502** | Open-Meteo の障害・接続失敗 | 少し待つ。**Worker に再試行・タイムアウトは無い** |
| ブラウザから直接呼ぶと CORS で落ちる | `ALLOWED_ORIGINS` にそのオリジンが無い(未設定なら全拒否) | `wrangler.jsonc` の `vars` に足す。通常は Next.js の API ルート経由にする |
| 通知が来ない | ①`VAPID_PRIVATE_KEY` 未設定 ②購読に**地点が無い**(古い購読) ③初回(直前値が無い) ④条件(閾値)に届かない ⑤購読が 404/410 で削除された | ログ(`[push]`・`[scheduled]`)を見る。②③は仕様 |
| 同じ地点なのに、値がわずかに違う | キャッシュのキーは**小数 2 桁**(約 1 km)。同じ格子は、同じ観測を共有する | 仕様。座標は要求のものに差し替えて返す |
| MCP が 403・`error 1010` | Cloudflare のボット対策が User-Agent を遮断 | `server.py` の固有の User-Agent を消していないか |
| MCP が「接続に失敗」 | `WEATHERGEOBRIDGE_WORKER_URL` が違う(既定 `http://localhost:8788`) | 環境変数を確かめる |

## 既知の問題・注意(読んで見つけたもの。コードは変えていない)

1. **MCP のツールは、`api_key` を引数で受け取る**(`server.py`)。引数は **AI モデルとやりとりの記録に載る**ので、キーが**モデルの入力・ログに残りうる**。キーは、サーバーの環境変数で持つ(ツールの引数にしない)形が安全。
2. **湿度が分からない(`None`)とき、洗濯の判定は湿度を無視する**(`yes` になりうる)。倒し方は設計の判断で、`unknown` に倒す案もある。
3. **キャッシュのキーは小数 2 桁(約 1 km)**。同じ格子の別の地点は、同じ観測を共有する(返すときは要求座標に差し替える)。
4. **Worker の TypeScript・`web/` は、このリポジトリのテストで未実行**(Cloudflare の環境が要る)。
5. **Open-Meteo への `fetch` に、タイムアウトも再試行も無い**(`weather.ts` の `get`)。遅い・止まった上流に、Worker の実行時間を取られうる。
6. **時刻は `Asia/Tokyo` 固定**(`timezone` を固定して取得し、`series.ts` の間引きも JST の切り捨て)。日本以外の地点の「いま」は、**日本時間の時刻**として並ぶ。
7. **系列のキャッシュのキーは、地点の順番に依存**する。同じ地点の集合でも、順番が違えば別のキャッシュ(ヒット率が下がる)。
8. **KV は結果整合**。購読の登録の直後に定期ジョブが走ると、その購読を読み落とすことがある(次の回で拾われる)。
9. **`VAPID_SUBJECT` の既定**(`push.ts`)は `mailto:example@example.com`。未設定のままだと、プッシュサービスが問題時に連絡できない(`wrangler.jsonc` の `vars` に URL を入れてある)。
10. 旧 README にある**公開 URL**・ワーカーの名前は、運用の情報(書き換えるときは、[旧 README](../reference/setup-and-operations.md) を直す)。

## 定期の保守

| いつ | 何を |
|---|---|
| 月に 1 回 | `npm audit`(`worker/`・`web/`)・依存の更新。**Next.js は脆弱性が出やすい** |
| 鍵を変えたとき | Worker の `WEATHERGEOBRIDGE_API_KEY` と、Next.js の同名の環境変数を**同時に**変える(MCP は引数) |
| `compatibility_date` を上げるとき | `wrangler.jsonc`。`wrangler dev` で全ルートを叩いてから |
| Open-Meteo の仕様変更の知らせ | `weather.ts` のパラメータ名・レスポンスの読み替えを見直す(変わると `undefined` になる) |
| 通知の仕様を変えたとき | **既存の購読が古い形のまま残る**ことを考える(`preferences` が欠けていても動くこと) |
| 文書を触ったとき | `python tools/check_docs.py` |

## 直す前の確認

1. 認証・CORS・レート制限の変更は、**ゆるめる方向**なら、理由を文書に書く(過去に「全許可」「`*`」を、意図して閉じた経緯がある)。
2. 通知の変更は、**購読者ごとの地点**を壊していないか(全員に飛ぶ不具合の再発)。
3. キャッシュの期限は、**捨てる > 使える**を守る。
