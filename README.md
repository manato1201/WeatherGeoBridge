# WeatherGeoBridge

天気情報の取得・通知・閲覧を提供するWebアプリを核に、自前ホスト地図(PMTiles+MapLibre GL JS)と統合しつつ、
他プロジェクトから利用可能なAPI/MCPとして提供する。設計の全体像は [WeatherGeoBridge_DESIGN.md](WeatherGeoBridge_DESIGN.md) を参照。

## 構成

```
core/            天気取得・正規化コア(Phase1、Python)
cache/           TTL付きキャッシュ + アラート差分検知フック(Phase1/Phase2)
notifications/   Web Push送信・購読情報の永続化(Phase2)
server/          REST APIサーバー(Phase4、X-API-Key認証)
mcp_server/      MCPサーバー(Phase5、stateless)
web/             Next.jsフロントエンド(Phase2/Phase3、ダッシュボード+地図)
```

Phase6(VRChat/Unity実世界同期)は設計のみで実装対象外。詳細は設計書のPhase6章を参照。

## セットアップ

### 1. Python バックエンド

```bash
python -m venv .venv
.venv/Scripts/activate   # Windows。macOS/Linuxは source .venv/bin/activate
pip install -r requirements.txt
```

環境変数(`env.example`を参照。このプロジェクトは`.env`ファイルを読み込まないため、
シェルで直接exportするか起動コマンドの先頭に付与すること):

| 変数 | 用途 |
|---|---|
| `WEATHERGEOBRIDGE_API_KEY` | REST API/MCP共通のX-API-Key。未設定時は認証なしの開発モード |
| `WEATHERGEOBRIDGE_API_PORT` | REST APIサーバーのポート(既定8787) |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` | Web Push用VAPID鍵 |

VAPID鍵は`pywebpush`が依存する`py-vapid`同梱のCLIで生成できる:

```bash
vapid --gen
# applicationServerKey(公開鍵)とprivate_key.pemの内容をそれぞれ
# VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY に設定する
```

REST APIサーバー起動:

```bash
WEATHERGEOBRIDGE_API_KEY=<発行したキー> python -m server.api_server
```

MCPサーバー起動(Claude Code等から利用する場合):

```bash
WEATHERGEOBRIDGE_API_KEY=<発行したキー> python -m mcp_server.server
```

Claude Codeの設定例(`.mcp.json`):

```json
{
  "mcpServers": {
    "weathergeobridge": {
      "command": "python",
      "args": ["-m", "mcp_server.server"],
      "cwd": "/path/to/WeatherGeoBridge",
      "env": { "WEATHERGEOBRIDGE_API_KEY": "<発行したキー>" }
    }
  }
}
```

`get_weather`/`get_forecast`ツールは各呼び出しの引数に`api_key`を渡す(statelessのため
セッション単位の認証状態は持たない)。

### 2. Next.js フロントエンド

```bash
cd web
npm install
```

`web/env.local.example` を `web/.env.local` にコピーし、Pythonバックエンドの接続先とAPIキーを設定する:

```
WEATHERGEOBRIDGE_API_BASE_URL=http://localhost:8787
WEATHERGEOBRIDGE_API_KEY=<REST APIサーバーに設定したものと同じ値>
```

```bash
npm run dev
```

`http://localhost:3000` でダッシュボードが開く。ブラウザから直接Pythonバックエンドの
APIキーを扱うことはなく、Next.js API Route(`app/api/*`)がserver-side fetchで仲介する。

### 3. 地図データ(PMTiles)の配置

実際の日本地図データ(自前生成PMTiles)は本リポジトリに同梱していない。
`web/public/map/README.md` の手順に従い、`japan.pmtiles`を生成・配置すること。
`armd-01.sakura.ne.jp`は利用規約上直接参照しないため、必ず自前ホストのファイルを使う。

未配置の状態でもフロントエンドはクラッシュせず、「地図タイルが未配置です」という
案内を表示する。

## 動作確認

- `curl http://localhost:8787/health` → `{"status": "ok", ...}`
- `curl http://localhost:8787/api/weather?lat=35.68&lon=139.77` → 401(X-API-Keyなし)
- `curl -H "X-API-Key: <キー>" http://localhost:8787/api/weather?lat=35.68&lon=139.77` → 200
- ダッシュボードで「手動ピン留め」から緯度経度を入力すると天気カード・予報・地図が表示される
