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

- Webアプリ: https://weathergeobridge.vercel.app
- REST API: https://weathergeobridge-api.manato1201m.workers.dev

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

`get_weather`/`get_forecast`ツールは各呼び出しの引数に`api_key`を渡す(statelessのため
セッション単位の認証状態は持たない)。

### 4. 地図データ(PMTiles)の配置

実際の日本地図データ(自前生成PMTiles)は本リポジトリに同梱していない。
`web/public/map/README.md` の手順に従い、`japan.pmtiles`を生成・配置すること。
`armd-01.sakura.ne.jp`は利用規約上直接参照しないため、必ず自前ホストのファイルを使う。

未配置の状態でもフロントエンドはクラッシュせず、「地図タイルが未配置です」という
案内を表示する。

## 動作確認

- `curl https://<worker>.workers.dev/health` → `{"status": "ok", ...}`
- `curl https://<worker>.workers.dev/api/weather?lat=35.68&lon=139.77` → 401(X-API-Keyなし)
- `curl -H "X-API-Key: <キー>" https://<worker>.workers.dev/api/weather?lat=35.68&lon=139.77` → 200
- ダッシュボードで「手動ピン留め」から緯度経度を入力すると天気カード・時間別予報・日別予報・地図が表示される
