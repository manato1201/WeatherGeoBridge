# WeatherGeoBridge

天気情報の取得・通知・閲覧を提供するWebアプリを核に、自前ホスト地図(PMTiles+MapLibre GL JS)と統合しつつ、
他プロジェクトから利用可能なAPI/MCPとして提供する。設計の全体像は [WeatherGeoBridge_DESIGN.md](WeatherGeoBridge_DESIGN.md) を参照
(ただしバックエンドの実装言語・ホスティング先は後日Python→Cloudflare Workersへ変更している。詳細は同ファイル冒頭の更新履歴ノート参照)。

## 構成

```
worker/          天気取得・正規化・キャッシュ・通知・REST API(Cloudflare Workers、TypeScript)
mcp_server/      MCPサーバー(Phase5、stateless、Workerの公開APIをHTTPで呼ぶだけの薄いクライアント)
web/             Next.jsフロントエンド(Phase2/Phase3、ダッシュボード+地図、Vercelで公開)
```

Phase6(VRChat/Unity実世界同期)は設計のみで実装対象外。詳細は設計書のPhase6章を参照。

## 公開URL

| 種別 | URL | 内容 |
|---|---|---|
| トップ | https://weathergeobridge.vercel.app/ | 見出しと主要数値(掲載地点数・更新時刻・予報の範囲) |
| **天気アトラス** | https://weathergeobridge.vercel.app/atlas | 地図が主役。気温/降水/風を色(平面)または高さ(立体)で表示し、下の時間スライダーで +72時間(3時間刻み)を送れる。左に地点一覧(検索・お気に入り・近い順・降水が多い順・予報の注意)。地点を選ぶと詳細ドロワー(スマホはボトムシート)。再生速度 0.25×〜2×、キー操作: Space 再生/停止・← → か , . で3時間送り・M 指標・3 平面/立体 |
| ダッシュボード | https://weathergeobridge.vercel.app/dashboard | 現在の天気・予報・大気質・3Dテレメトリー・通知設定(旧トップ) |
| REST API | https://weathergeobridge-api.manato1201m.workers.dev | 下の「APIエンドポイント」を参照(`X-API-Key`必須) |
| MCP | `python -m mcp_server.server`(セットアップ3) | `get_weather` / `get_forecast` / **`decide_umbrella`** / **`decide_laundry`** |

全画面の下に「データ元: Open-Meteo / 取得時刻 / 予報であって保証ではありません」を固定表示している。
旧URL(`/?lat=..&lon=..`)は `/dashboard` へ自動で引き継がれる。

### APIエンドポイント

| パス | 内容 |
|---|---|
| `GET /api/weather?lat&lon` | 現在の天気(10分キャッシュ) |
| `GET /api/weather/forecast?lat&lon&days` | 時間別・日別の予報 |
| `GET /api/weather/history?lat&lon` | 昨日・先週の同時刻の気温 |
| `GET /api/weather/series?points=lat,lon;lat,lon` | 複数地点(最大40)の +72時間・3時間刻みの予報(アトラスの左一覧) |
| `GET /api/weather/grid?lat&lon&span&n` | 中心を格子に丸めた n×n(既定8×8、span=2.4度)のメッシュ予報(アトラスの地図) |
| `GET /api/air-quality?lat&lon` | 大気質 |
| `POST /api/push/subscribe` | Web Push購読(地点・通知条件つき) |

### MCPの判断ツール

`decide_umbrella`(傘は要るか)・`decide_laundry`(洗濯物を外に出せるか)は、`answer`(yes/no/unknown)・
`rain_probability_percent`・判断の根拠(`evidence`)を返す。ルールは `mcp_server/decisions.py`
(ルールベース。判断専用モデルへ差し替える口として `DECIDERS` に集約)。
**`rain_probability_percent`はOpen-Meteoの降水確率(予報)の最大値で、ルールの確からしさではない。**
境界値は `python -m unittest mcp_server.test_decisions` で確認できる(降水確率50%で傘=yes、30%で洗濯=no など)。

## アーキテクチャ

```
ブラウザ(Next.js フロントエンド、Vercel)
   │  geolocation / 手動ピン
   ▼
Next.js API Routes (server-side, API keyを秘匿)
   │  X-API-Key付きでfetch
   ▼
Cloudflare Worker (worker/, Hono, TypeScript)
   │
   ├─ Open-Meteo呼び出し・正規化(worker/src/weather.ts)
   ├─ KVキャッシュ(worker/src/cache.ts、TTL10分、差分検知→push通知トリガー)
   └─ Web Push送信(worker/src/push.ts、@mmmike/web-push、WebCrypto APIのみで動作)

MCPサーバー (mcp_server/server.py、Python、stateless)
   └─ 上記Workerの公開REST APIをHTTP経由で呼ぶだけ(ロジックの二重実装なし)
```

Next.js公式のCloudflareアダプタはメンテナンス終了・非推奨のため、フロントエンドはVercel、
バックエンドのみCloudflare Workers + KVという構成にしている(Next.js on Cloudflareは非推奨)。

## セットアップ

### 1. Cloudflare Worker(バックエンド)

```bash
cd worker
npm install
```

KV namespaceを作成し、`wrangler.jsonc`の`id`を差し替える(既に本リポジトリのnamespaceで運用中):

```bash
npx wrangler kv namespace create WEATHER_CACHE
npx wrangler kv namespace create PUSH_SUBSCRIPTIONS
```

secretsを設定する(`WEATHERGEOBRIDGE_API_KEY`はREST API/MCP共通の認証キー、VAPID鍵はWeb Push用):

```bash
npx wrangler secret put WEATHERGEOBRIDGE_API_KEY
npx wrangler secret put VAPID_PRIVATE_KEY
```

VAPID鍵ペアは`@mmmike/web-push`の`generateVapidKeys()`で生成できる:

```bash
node -e "import('@mmmike/web-push').then(async m => console.log(JSON.stringify(await m.generateVapidKeys())))"
```

公開鍵は`wrangler.jsonc`の`vars.VAPID_PUBLIC_KEY`に設定する(非機微情報)。
`vars.VAPID_SUBJECT`はpushサービスが問題発生時に連絡する宛先(`mailto:`かURL)。既定のプレースホルダから
自分の連絡先に変更することを推奨する。

ローカル動作確認:

```bash
npx wrangler dev --port 8788
```

デプロイ:

```bash
npx wrangler deploy
```

### 2. Next.js フロントエンド

```bash
cd web
npm install
```

`web/env.local.example` を `web/.env.local` にコピーし、Workerの接続先とAPIキーを設定する:

```
WEATHERGEOBRIDGE_API_BASE_URL=https://<your-worker>.workers.dev
WEATHERGEOBRIDGE_API_KEY=<Workerに設定したものと同じ値>
```

```bash
npm run dev
```

`http://localhost:3000` でダッシュボードが開く。本番はVercelにGit連携でデプロイ済み(pushで自動デプロイ)。
Vercel側の環境変数(Production)は`vercel env add WEATHERGEOBRIDGE_API_BASE_URL production`等で設定する。

### 3. MCPサーバー(Claude Code等から利用する場合)

```bash
python -m venv .venv
.venv/Scripts/activate
pip install -r requirements.txt

WEATHERGEOBRIDGE_WORKER_URL=https://<your-worker>.workers.dev python -m mcp_server.server
```

Claude Codeの設定例(`.mcp.json`):

```json
{
  "mcpServers": {
    "weathergeobridge": {
      "command": "python",
      "args": ["-m", "mcp_server.server"],
      "cwd": "/path/to/WeatherGeoBridge",
      "env": {
        "WEATHERGEOBRIDGE_WORKER_URL": "https://<your-worker>.workers.dev"
      }
    }
  }
}
```

`get_weather`/`get_forecast`/`decide_umbrella`/`decide_laundry`ツールは各呼び出しの引数に`api_key`を渡す
(statelessのため セッション単位の認証状態は持たない)。

### 4. 地図データ(PMTiles)の配置

日本全域のPMTiles(z0〜11)は自前のCloudflare R2バケットから配信している。
再生成・アップロード・CORS設定・スタイル生成(ライト/ダークの2種)の手順は
`web/public/map/README.md` を参照。`armd-01.sakura.ne.jp`は利用規約上直接参照しない。

## シークレット・公開範囲の棚卸し(2026-10)

| 名前 | 置き場所 | 種別 | 備考 |
|---|---|---|---|
| `WEATHERGEOBRIDGE_API_KEY` | Worker secret / Vercel環境変数(Production、sensitive) / MCPの`api_key`引数 | **秘密** | REST API・MCP共通。ブラウザには渡さない(Next.js API Route経由)。推奨: 32文字以上のランダム値に定期ローテーション |
| `VAPID_PRIVATE_KEY` | Worker secret | **秘密** | Web Push署名用 |
| `VAPID_PUBLIC_KEY` | `worker/wrangler.jsonc` の `vars` | 公開 | ブラウザへ配布する値 |
| `VAPID_SUBJECT` | `worker/wrangler.jsonc` の `vars` | 公開(連絡先) | pushサービスが問題時に連絡する宛先 |
| `ALLOWED_ORIGINS` | `worker/wrangler.jsonc` の `vars` | 公開 | CORS許可オリジン(下記) |
| R2バケット `weathergeobridge-map-tiles` | Cloudflare | 公開(読み取りのみ) | 地図タイルのみ。CORSは`worker/r2-cors.json` |

- **Workerの呼び出し元の絞り込み**: CORSは許可リスト方式(`ALLOWED_ORIGINS`、既定は本番ドメインとlocalhostのみ。未設定なら全拒否)。
  以前は`*`だった。ブラウザは通常Next.jsのAPI Route(server-side)経由でWorkerを呼ぶためCORSを必要としない。
  CORSはブラウザ向けの防御で、curl等からの呼び出しは`X-API-Key`認証が唯一の防御になる点に注意。
- リポジトリに追跡されている秘密ファイルは無い(`.dev.vars`・`.env*`は`.gitignore`済み)。
- Wranglerに登録済みのsecretは上記2つのみ(`wrangler secret list`で確認)。
- 要確認: Vercel側の環境変数は、この棚卸しの時点ではCLIの認証切れのため一覧を確認できていない。
  `vercel login`後に `vercel env ls` で `WEATHERGEOBRIDGE_API_BASE_URL` / `WEATHERGEOBRIDGE_API_KEY` のみであることを確認すること。

## 動作確認

- `curl https://<worker>.workers.dev/health` → `{"status": "ok", ...}`
- `curl https://<worker>.workers.dev/api/weather?lat=35.68&lon=139.77` → 401(X-API-Keyなし)
- `curl -H "X-API-Key: <キー>" https://<worker>.workers.dev/api/weather?lat=35.68&lon=139.77` → 200
- ダッシュボード(/dashboard)で「手動ピン留め」から緯度経度を入力すると天気カード・時間別予報・日別予報・地図が表示される
- 天気アトラス(/atlas)で時間スライダーを動かすと、地図の色(立体では高さ)・左一覧の数値・下の「表示中の時刻」が同じ時刻で更新される
- `curl -H "X-API-Key: <キー>" "https://<worker>.workers.dev/api/weather/grid?lat=35.68&lon=139.77"` → 25時刻×64点のメッシュ予報
