# WeatherGeoBridge 設計書

**設計指標: 天気情報の取得・通知・閲覧を提供するWebアプリを核に、自前ホスト地図と統合しつつ、他プロジェクトから利用可能なAPI/MCPとして提供し、実世界の天候・位置をVRChat/Unityワールドへ同期する応用へつなげる**
作成日: 2026-09-05 / 想定規模: 中〜大規模(コア天気サービス+Webアプリ+地図統合+API+MCP+ゲームエンジン同期の将来設計)

---

対話の中で段階的に方向性が確定した文書。当初要求は「天気情報を取得し通知・閲覧できるWebアプリ。他プロジェクトに渡せるようAPI化・MCP化する。GPSを使って何かに応用したい(応用先は未定)」というものだった。これに対しアシスタントから「実世界の天候・位置情報を、ユーザー自身が既に持つVRChat/Unityプロジェクトに同期させる」という応用先を提案し、承認された。さらにユーザーから`https://armd-01.sakura.ne.jp/tiles/`(PMTiles形式による日本地図配信、OpenStreetMapデータ、自前サーバーでホストしMapLibre GL JSで表示、Google Maps APIの課金回避が動機)と、その技術解説記事(Qiita、PMTiles+MapLibre GL JS+HTTP Range Requestによる部分取得の仕組み)という2つの参考リンクが提示され、この地図技術との統合が明示的に要望された。本書はこの経緯をそのままPhase構成に反映する。

---

**更新履歴ノート(2026-09-05、実装後の変更)**: Phase1・Phase4のバックエンドは当初本書の通りPython(`core/`・`cache/`・`server/`)で実装したが、「自分のPCや別サーバーを保持し続けたくない」というユーザー要望を受け、天気取得・KVキャッシュ・差分通知・Web Push送信・REST APIを**Cloudflare Workers(TypeScript、`worker/`)+ Workers KV**へ移行した(Python版の`core/`・`cache/`・`notifications/`・`server/`は削除済み)。フロントエンド(Next.js)はCloudflare公式のNext.js用アダプタが非推奨のため、そのままVercelでの公開を継続している。Phase5のMCPサーバー(`mcp_server/`)はPythonのまま残しているが、内部実装はWorkerの公開REST APIをHTTP経由で呼ぶだけの薄いクライアントに変更した。以降のPhase1〜5本文はPython実装当時の記述のままだが、ロジック・スキーマ・エンドポイント設計自体は変更していないため、実装言語の read replace として読み替えること。詳細は[README.md](README.md)を参照。

---

## Phase 0: コンセプト・要件定義

### 目的

「天気を見るだけのWebアプリ」で終わらせず、(1)他プロジェクトが再利用できるAPI/MCP、(2)自前ホスト地図との統合、(3)実世界の天候・位置をゲームエンジン(VRChat/Unity)へ同期する応用、という3層構造で設計する。ただし3層目(Phase6)は本書のスコープを「呼び出し可能なAPI/MCPを用意するところまで」に限定し、VRChat/Unity側の実装(UdonSharp/C#)自体は対象外とする。

### 技術選定と理由

**(a) 天気データソース: Open-Meteo を採用。**
理由: APIキー不要・無料・日本の気象庁(JMA)データも選択可能・レート制限が緩い。他の商用天気API(OpenWeatherMap等)と異なりAPIキー管理・課金上限を気にする必要がなく、「個人開発規模でAPI/MCPとして他プロジェクトに渡す」という要求と相性が良い。認証の心配なく`core/weather_client.py`を他プロジェクトへそのままコピーできる前提が成立する。

**(b) 地図: PMTiles + MapLibre GL JS + OpenStreetMapデータ、自前ホスト。**
ユーザー提示の`armd-01.sakura.ne.jp/tiles/`とその技術解説記事(PMTiles形式、MapLibre GL JSでのPMTilesプロトコル登録、HTTP Range Requestによる部分取得)を直接の実装前例として採用する。Google Maps API等の従量課金サービスは使わない。理由: PMTilesは単一の静的ファイルをHTTP Range Requestで部分取得できるため、タイルサーバーというサーバーサイドの常駐プロセスが不要になり、静的ファイルホスティングだけで地図配信が完結する。個人開発の運用コストと相性が良い。

**(c) API/MCPの両方を提供する。**
REST APIは他言語・他プラットフォーム(UnityのC#等)からの直接利用を想定し、MCPはClaude Code等のAIエージェントからの直接利用を想定する。両者は用途で明確に切り分け、同一ロジックを内部で共有する(Phase5参照)。

### 概念モデル

```
WeatherObservation {
  lat: float
  lon: float
  observedAt: string   // ISO8601
  temperatureC: float
  precipitationMm: float
  weatherCode: int     // WMO weather interpretation code(Open-Meteo準拠)
  windSpeedMs: float
  source: "open-meteo"
}

LocationContext {
  lat: float
  lon: float
  accuracyMeters: float
  source: "browser_gps" | "manual_pin" | "game_avatar_position"
}
```

### 要求機能

1. 天気取得+通知+閲覧のWebアプリ
2. REST API化
3. MCP化
4. 自前ホスト地図(PMTiles+MapLibre GL JS)との統合
5. GPS応用としての実世界天候・位置→VRChat/Unityワールド同期(将来フェーズとして設計のみ記載)

### 非機能要件

- 通知はWeb Push API(Service Worker経由)で実現する。独自のポーリングアプリを常駐させない。
- 地図はPMTilesのHTTP Range Requestによる部分取得を活かし、閲覧のたびに全データをダウンロードしない設計にする。
- MCPはstateful(セッションID方式)ではなくstateless設計にする(理由はPhase5で詳述)。

### 前提・制約

- v1ではVRChat/Unity側の実装(UdonSharp/C#スクリプト)は本書のスコープ外とする。Phase6は「Unity側から呼び出し可能なAPI/MCPを用意するところまで」を対象とし、設計のみ記載して実装は行わない。
- `Enterprises/TestIwaSync`(Unity 2022.3.22f1、UdonSharpベースのVRChatワールド、`Assets/UdonSharp`/`Assets/HoshinoLabs`/`Assets/mikinel`等の実在するアセットディレクトリを確認済み、AudioLink組み込み済み)を第一の実統合先として名指しする。
- `UnityHDRPBlackHole`(Unity 6000.0.58f2、HDRP 17.0.4)を第二の実統合先として名指しする。

### アンチパターン(全フェーズ共通)

- 天気データの取得ロジックと通知ロジックを密結合させない。Phase1のコア(取得・正規化・キャッシュ)とPhase2の通知(アラート判定・配信)は明確に分離し、Phase2はPhase1のキャッシュ層を外部から参照するだけにする。
- 地図タイルを自前サーバーから配信する際、ユーザー提示の`armd-01.sakura.ne.jp`自体を直接参照しない。同サイトの利用規約で直接参照が非推奨と明記されているため、自分のPMTilesファイルを別途用意し自前ホストする。
- REST APIとMCPサーバーで天気取得ロジックを二重実装しない(Phase5で明記)。
- Phase6のゲームエンジン統合を「実位置追跡」からいきなり要求しない。固定地点/手動ピン留めをデフォルトとする(Phase6で詳述)。

**検証チェックリスト:**
- [ ] Open-Meteo採用理由(APIキー不要・レート制限が緩い)が要求機能(2)(3)の「他プロジェクトへの再配布容易性」と整合している
- [ ] PMTiles自前ホスト方針が`armd-01.sakura.ne.jp`への直接依存を作らない設計になっている
- [ ] `WeatherObservation`/`LocationContext`スキーマが以降の全フェーズ(API/MCP/ゲームエンジン統合)で一貫して参照される前提になっている
- [ ] Phase6が「設計のみ・実装スコープ外」であることが本書内で明示されている

---

## Phase 1: 天気データ取得+正規化コア(最優先・全フェーズの基盤)

**現状:** 天気データの取得・正規化・キャッシュを担うコアロジックが存在しない。これを最初に作らないと、Phase2(Webアプリ)・Phase4(REST API)・Phase5(MCP)がそれぞれ独自に天気取得を実装してしまい、Phase0のアンチパターン(ロジック密結合・重複)に直結する。

**実装内容:**

1. `core/weather_client.py`を実装する。Open-Meteo Forecast API(`https://api.open-meteo.com/v1/forecast`)を呼び出すクライアント。

   ```
   GET https://api.open-meteo.com/v1/forecast
     ?latitude=35.6812&longitude=139.7671
     &current=temperature_2m,precipitation,weather_code,wind_speed_10m
     &timezone=Asia%2FTokyo
   ```

   Open-Meteoレスポンス例:
   ```json
   {
     "latitude": 35.68,
     "longitude": 139.77,
     "current": {
       "time": "2026-09-05T14:00",
       "temperature_2m": 28.4,
       "precipitation": 0.0,
       "weather_code": 2,
       "wind_speed_10m": 3.1
     }
   }
   ```

2. `WeatherObservation`への変換層(`core/weather_normalizer.py`)を実装する。

   ```python
   def normalize(raw: dict, lat: float, lon: float) -> "WeatherObservation":
       cur = raw["current"]
       return WeatherObservation(
           lat=lat,
           lon=lon,
           observed_at=cur["time"],
           temperature_c=cur["temperature_2m"],
           precipitation_mm=cur["precipitation"],
           weather_code=cur["weather_code"],
           wind_speed_ms=cur["wind_speed_10m"],
           source="open-meteo",
       )
   ```

3. キャッシュ層`cache/weather_cache.py`を実装する。同一地点(緯度経度を小数点2桁程度に丸めたキー、約1.1km四方の粒度)への頻繁な問い合わせを避けるため、TTL付きキャッシュ(既定10分)を持つ。

   ```python
   # cache/weather_cache.py(概念)
   class WeatherCache:
       ttl_seconds: int = 600

       def get_or_fetch(self, lat: float, lon: float) -> WeatherObservation:
           key = self._round_key(lat, lon)   # 例: "35.68,139.77"
           cached = self._store.get(key)
           if cached and (now() - cached.fetched_at) < self.ttl_seconds:
               return cached.observation
           obs = normalize(fetch_open_meteo(lat, lon), lat, lon)
           self._store.set(key, obs, fetched_at=now())
           return obs
   ```

4. Phase2〜6は全てこの`core/`層を経由し、Open-Meteoを直接呼び出さない。この依存方向をPhase0のアンチパターン(密結合・重複)の遵守確認として扱う。

**検証チェックリスト:**
- [ ] Open-MeteoのAPIレスポンスが`WeatherObservation`スキーマへ欠損なく変換される
- [ ] 同一地点(丸めキー同一)への10分以内の再問い合わせがキャッシュヒットしOpen-Meteoへの再リクエストを発生させない
- [ ] TTL経過後は再フェッチが発生する
- [ ] APIキー不要でクライアントが動作する(認証設定なしでの動作確認)

---

## Phase 2: Webアプリ(閲覧+通知)

**現状:** Phase1でコアは用意できるが、ユーザーが直接触れる閲覧・通知の画面がない。

**実装内容:**

1. フロントエンドはNext.jsを採用する。本ワークスペースの他プロジェクト群(Next.js系)との一貫性を理由とする(新規フレームワークを個別採用しない)。
2. ブラウザGeolocation API(`navigator.geolocation.getCurrentPosition`)で現在地を取得し、`LocationContext{source: "browser_gps"}`として`core/weather_client.py`(Phase1)へ渡す。
3. ダッシュボードは現在地の天気(気温・降水量・天候アイコン・風速)と簡易予報(Open-Meteoの`daily`パラメータで取得する数日分)を表示する。
4. Web Push API + Service Workerによる通知を実装する。

   ```js
   // sw.js(概念)
   self.addEventListener('push', (event) => {
     const data = event.data.json();
     self.registration.showNotification(data.title, {
       body: data.body,   // 例: "まもなく降水が始まります(15分以内)"
       icon: '/icons/rain.png',
     });
   });
   ```

5. アラート条件はPhase1のキャッシュ層をポーリング/差分検知することで実現する。新規の監視インフラは作らず、キャッシュ更新のタイミングで前回値との差分(降水量0→非0への変化、気温の急変=1時間で±5℃以上等)を判定し、条件を満たせばWeb Push送信をトリガーする。

**検証チェックリスト:**
- [ ] Geolocation APIで取得した位置情報からダッシュボードに現在地の天気が表示される
- [ ] Service Worker経由でWeb Push通知の購読登録ができる
- [ ] 降水開始・気温急変の差分判定がPhase1キャッシュ層の更新をトリガーに動作する
- [ ] Next.js採用によりビルド/デプロイ手順が本ワークスペースの他Next.jsプロジェクトと共通化されている

---

## Phase 3: 自前ホスト地図統合(PMTiles+MapLibre GL JS)

**現状:** Phase2までは天気情報がテキスト/数値表示のみで、位置関係を地図上で把握できない。ユーザーが提示した参考技術(PMTiles+MapLibre GL JS+自前ホスト)をここで統合する。

**実装内容:**

1. ユーザー提示の技術解説記事(PMTiles形式、MapLibre GL JSでのPMTilesプロトコル登録、HTTP Range Requestによる部分取得)を直接の実装前例として引用する。ファイル構成:

   ```
   WeatherGeoBridge/
     public/
       map/
         japan-20260901.pmtiles     // 自前生成・自前ホストのPMTilesファイル
         style.json                 // MapLibreスタイル定義
   ```

2. MapLibre GL JS側でPMTilesプロトコルを登録する。

   ```js
   import { Protocol } from 'pmtiles';
   import maplibregl from 'maplibre-gl';

   const protocol = new Protocol();
   maplibregl.addProtocol('pmtiles', protocol.tile);

   const map = new maplibregl.Map({
     container: 'map',
     style: '/map/style.json',
     center: [139.7671, 35.6812],
     zoom: 10,
   });
   ```

   `style.json`内のソース定義:
   ```json
   {
     "sources": {
       "japan": {
         "type": "vector",
         "url": "pmtiles:///map/japan-20260901.pmtiles"
       }
     }
   }
   ```

3. 地図上への天気オーバーレイを実装する。Phase1で取得済みの`WeatherObservation`地点をGeoJSONソースとしてMapLibreに追加し、マーカー(単一地点)またはヒートマップレイヤー(複数観測点)として表示する。

   ```js
   map.addSource('weather-points', {
     type: 'geojson',
     data: {
       type: 'FeatureCollection',
       features: observations.map(o => ({
         type: 'Feature',
         geometry: { type: 'Point', coordinates: [o.lon, o.lat] },
         properties: { temp: o.temperatureC, code: o.weatherCode },
       })),
     },
   });
   ```

4. 地図データの更新運用: PMTilesファイルは定期的(月次目安)にOpenStreetMapの最新データから再生成し、`japan-<date>.pmtiles`という日付サフィックス付きファイル名で`public/map/`へ配置、`style.json`の参照先を切り替える運用とする。旧ファイルは即削除せず一定期間残し、切り戻しに備える。

**検証チェックリスト:**
- [ ] PMTilesプロトコル登録後、MapLibre GL JSで地図が正しく描画される
- [ ] ブラウザのネットワークログでPMTilesファイルへのアクセスがHTTP Range Request(部分取得)になっていることを確認する(全ファイル一括ダウンロードでないこと)
- [ ] Phase1の`WeatherObservation`地点が地図上にマーカー/ヒートマップとして表示される
- [ ] `armd-01.sakura.ne.jp`への直接参照が存在しない(自前PMTilesファイルのみを参照している)

---

## Phase 4: REST API化

**現状:** Phase1〜3の機能はブラウザ内で完結しており、他プロジェクト(UnityのC#等)から直接呼び出す手段がない。

**実装内容:**

1. エンドポイント定義。

   ```
   GET /api/weather?lat=35.6812&lon=139.7671
   → 200 OK
   { "lat": 35.6812, "lon": 139.7671, "observedAt": "2026-09-05T14:00:00+09:00",
     "temperatureC": 28.4, "precipitationMm": 0.0, "weatherCode": 2,
     "windSpeedMs": 3.1, "source": "open-meteo" }

   GET /api/weather/forecast?lat=35.6812&lon=139.7671&days=3
   → 200 OK
   { "lat": 35.6812, "lon": 139.7671,
     "daily": [ { "date": "2026-09-06", "tempMaxC": 30.1, "tempMinC": 24.0, "precipitationMm": 2.0, "weatherCode": 61 }, ... ] }
   ```

2. 認証は`X-API-Key`ヘッダ方式を採用する。本ワークスペースの`DevelopmentRAGEnvironment/scripts/rag_local_bridge.py`(ポート`:8766`)が確立した準標準パターンをそのまま踏襲し、新規の認証方式を発明しない。LoreDesktopAndWebSystem、LearningQt、VLMAutoReplayTool等、既に複数プロジェクトが同方式を採用しており、Unity側(UnityWebRequest等)からの利用も含め一貫性を優先する。

   ```
   GET /api/weather?lat=35.6812&lon=139.7671
   X-API-Key: <発行済みキー>
   ```

3. OpenAPI定義(抜粋)でエンドポイントを明文化する。

   ```yaml
   openapi: 3.0.3
   info: { title: WeatherGeoBridge API, version: 1.0.0 }
   paths:
     /api/weather:
       get:
         parameters:
           - { name: lat, in: query, required: true, schema: { type: number } }
           - { name: lon, in: query, required: true, schema: { type: number } }
         security: [{ ApiKeyAuth: [] }]
         responses:
           "200": { content: { application/json: { schema: { $ref: "#/components/schemas/WeatherObservation" } } } }
   components:
     securitySchemes:
       ApiKeyAuth: { type: apiKey, in: header, name: X-API-Key }
     schemas:
       WeatherObservation:
         type: object
         properties:
           lat: { type: number }
           lon: { type: number }
           observedAt: { type: string, format: date-time }
           temperatureC: { type: number }
           precipitationMm: { type: number }
           weatherCode: { type: integer }
           windSpeedMs: { type: number }
           source: { type: string, enum: ["open-meteo"] }
   ```

4. `/api/weather`ハンドラの内部実装はPhase1の`WeatherCache.get_or_fetch`を直接呼び出す薄いラッパーとし、天気取得ロジックをここで再実装しない。

**検証チェックリスト:**
- [ ] `X-API-Key`ヘッダなしのリクエストが401で拒否される
- [ ] `/api/weather`のレスポンスが`WeatherObservation`のOpenAPIスキーマと一致する(スキーマ検証)
- [ ] `/api/weather/forecast`が`days`パラメータに応じた日数分のデータを返す
- [ ] エンドポイント内部がPhase1の`WeatherCache`/`weather_client`を再利用しており、Open-Meteo呼び出しを重複実装していない

---

## Phase 5: MCP化

**現状:** Phase4でREST APIは用意できるが、Claude Code等のAIエージェントから直接ツールとして呼び出す手段がない。ワークスペースの別文書`X_POSTS_INSIGHTS_PROPOSAL.md`では、MCPプロトコルがstateful(セッションID方式)からstateless方式へ移行しつつある動向が記録されており、本設計はこれを踏まえる。

**実装内容:**

1. MCPサーバーとして以下のtoolを定義する。

   ```json
   {
     "tools": [
       { "name": "get_weather", "description": "指定した緯度経度の現在の天気を取得する",
         "inputSchema": { "type": "object",
           "properties": { "lat": { "type": "number" }, "lon": { "type": "number" } },
           "required": ["lat", "lon"] } },
       { "name": "get_forecast", "description": "指定した緯度経度の数日先までの予報を取得する",
         "inputSchema": { "type": "object",
           "properties": { "lat": { "type": "number" }, "lon": { "type": "number" },
             "days": { "type": "integer", "minimum": 1, "maximum": 16 } },
           "required": ["lat", "lon"] } }
     ]
   }
   ```

2. **stateless設計を採用する。** セッションIDを持たず、各tool呼び出しは呼び出しごとに完結した引数(`lat`/`lon`/`days`)のみで応答を返す。理由: (a)`X_POSTS_INSIGHTS_PROPOSAL.md`で記録されたMCPのstateless化動向に沿う、(b)複数インスタンスへのロードバランスが容易になる(セッションアフィニティが不要)、(c)サーバーレス実行(リクエストごとに起動・終了する実行環境)への展開が容易になる。天気取得というドメイン自体が「過去の対話状態」に依存しない性質のものであり、statelessと相性が良い。

3. Phase4のREST APIをMCPツールが内部で呼び出す構成にする。ロジックを重複させない。

   ```python
   # mcp/tools.py(概念)
   async def get_weather(lat: float, lon: float) -> dict:
       # 内部的にPhase4の /api/weather を呼び出す(同一プロセス内呼び出しでも可)
       resp = await internal_api_client.get("/api/weather", params={"lat": lat, "lon": lon})
       return resp.json()
   ```

4. MCPサーバー自体の認証もPhase4と同じ`X-API-Key`方式を踏襲する(MCP専用の別認証方式を新設しない)。

**検証チェックリスト:**
- [ ] `get_weather`/`get_forecast`ツールがMCPクライアント(Claude Code等)から呼び出し可能
- [ ] 同一ツール呼び出しを複数回行っても、サーバー側にセッション状態が残らない(stateless性の確認)
- [ ] MCPツールの内部実装がPhase4のREST APIエンドポイントを呼び出しており、天気取得ロジックの重複実装がない
- [ ] `X-API-Key`未設定でのMCP呼び出しが拒否される

---

## Phase 6: GPS応用 — VRChat/Unity実世界同期(将来フェーズ・設計のみ)

**本フェーズはPhase0の前提通り設計のみとし、実装はスコープ外とする。** UdonSharp/C#の実コードは書かず、渡すべきデータの形とインターフェースのみを設計する。

**現状:** `Enterprises/TestIwaSync`(Unity 2022.3.22f1、UdonSharpベースのVRChatワールド、`Assets/UdonSharp`/`Assets/HoshinoLabs`/`Assets/mikinel`等の実在するアセットディレクトリを確認済み、AudioLink組み込み済み)と`UnityHDRPBlackHole`(Unity 6000.0.58f2、HDRP 17.0.4)は、いずれもGPS天候同期の実統合先として名指しできる状態にある。

**統合先1: `Enterprises/TestIwaSync`(UdonSharp/VRChat)**

- UdonSharp側からPhase4のREST APIを定期的にポーリングする設計とする。VRChatのUdonはネイティブな任意HTTPクライアントを持たないため、既存のVRChat API(`VRCStringDownloader`等の文字列ダウンロード機能)を使う前提で設計する。
- ポーリング間隔はPhase1のキャッシュTTL(10分)と整合させ、TTLより短い間隔でポーリングしても意味がないため、ワールド側も同程度(例: 5〜10分間隔)に揃える設計とする。
- 取得した`WeatherObservation.weatherCode`(WMO weather code)を、ワールド内で扱いやすい簡易カテゴリ(晴れ/曇り/雨/雪)へマッピングするテーブルをインターフェースとして定義する。

  ```
  // 設計上のマッピングインターフェース(実装コードではない)
  WeatherCategory MapToCategory(int wmoWeatherCode)
    0-1   → Clear
    2-3   → Cloudy
    45-67 → Rain
    71-86 → Snow
    95-99 → Storm
  ```

- マッピング結果を、ワールド内のパーティクルシステム(雨/雪パーティクルのオンオフ)・スカイボックス(晴れ/曇りマテリアル切替)・ライティング(色温度・強度)へ反映する設計とする。反映先はいずれも既存のUdonSharpコンポーネントが受け取れる「カテゴリ+補助パラメータ(気温・降水量)」という単純な入力形にとどめ、複雑な連続パラメータ制御はv1設計では要求しない。

**統合先2: `UnityHDRPBlackHole`(Unity6 HDRP17.0.4)**

- HDRPのVolume(Volume Profile経由のFog/Cloud Layer等)へ天候パラメータを渡す統合面を設計する。実装コードは書かず、渡すべきデータの形のみを定義する。

  ```
  // 設計上のインターフェース(実装コードではない)
  WeatherVolumeParams {
    cloudCoverage: float     // 0.0-1.0、weatherCode由来
    fogDensity: float        // 0.0-1.0、precipitationMm由来
    precipitationIntensity: float  // 0.0-1.0、precipitationMm由来
    ambientTemperatureC: float     // ライティング色温度演出の補助入力
  }
  ```

- 上記パラメータ構造体を、HDRPのVolume Override(雲レイヤー・Fog設定等)へマッピングする責務は、本書のスコープでは「インターフェース定義まで」とし、実際のVolume Override実装は将来フェーズに委ねる。

**GPS/位置情報の扱い:**

- 実際のプレイヤー物理位置(モバイルGPS等)ではなく、**「ワールド設定で指定した固定地点」または「手動ピン留め地点」を既定とする。** 理由: (a)プライバシー — VRChatワールド内でプレイヤーの実位置情報を扱うことは慎重を要し、v1でそこまで要求しない、(b)実用性 — VRChatはVR/デスクトップ双方からアクセスされ、モバイルGPSデバイスを常時携帯した利用は前提にできない。
- 将来的にモバイルGPS対応する場合は、`LocationContext.source: "game_avatar_position"`(Phase0で定義済み)を拡張点として使う想定を記録するに留める。

**優先度注記(本フェーズ固有):** 最大の不確実性は「UdonSharpからの外部HTTP通信の実現可能性」である。VRChatのセキュリティサンドボックス制約により、`VRCStringDownloader`等の既存APIでどこまでPhase4のREST APIを呼び出せるか(許可ドメインの制約、レスポンスサイズ制限、ポーリング頻度の制約等)は未検証であり、Phase6着手前に技術検証(スパイク)を行うべきである。

**検証チェックリスト:**
- [ ] `WeatherObservation.weatherCode`→`WeatherCategory`のマッピング設計がPhase4のAPIレスポンス形式と齟齬なく対応している
- [ ] `WeatherVolumeParams`の各フィールドがPhase1の`WeatherObservation`から一意に導出できる設計になっている
- [ ] 固定地点/手動ピン留めを既定とする設計が、実位置追跡をv1で要求しない方針と整合している
- [ ] UdonSharpからの外部HTTP通信の技術的実現可能性について、着手前にスパイク検証を行う方針が本書に明記されている

---

## Final Phase: 統合検証

- [ ] Phase1のキャッシュ層が同一地点への重複リクエストを防いでいる(TTL内の再問い合わせがOpen-Meteoへ到達しないことを実測)
- [ ] Web Push通知が実際にService Worker経由で届くことをブラウザで確認する
- [ ] PMTiles地図がHTTP Range Requestで部分取得されていることをネットワークログで確認する(全ファイルを毎回ダウンロードしていないことの実証)
- [ ] REST APIとMCPサーバーが同一のPhase1コアロジック(`weather_client`/`weather_cache`)を共有しており、ロジックの重複がない
- [ ] Phase6の設計(`TestIwaSync`/`UnityHDRPBlackHole`へのインターフェース、`WeatherCategory`/`WeatherVolumeParams`)がPhase4のAPIレスポンスの形と整合している
- [ ] `armd-01.sakura.ne.jp`への直接参照がコード上どこにも存在しない(自前PMTilesファイルのみを参照している最終確認)

---

## 相互参照セクション

- **`DevelopmentRAGEnvironment/scripts/rag_local_bridge.py`(ポート`:8766`)**: `X-API-Key`ヘッダ認証方式の直接の前例。Phase4/5の認証はこれを踏襲する。
- **`X_POSTS_INSIGHTS_PROPOSAL.md`**: MCPプロトコルのstateful→stateless移行動向の記録。Phase5のstateless設計判断の裏付け。
- **`ToolOrchestrationHub`設計書**: 将来的な登録候補。本サービスが安定稼働した後、`ToolRegistry`に`transport: http_bridge`または新設の`mcp`として登録される可能性がある。
- **`Enterprises/TestIwaSync`・`UnityHDRPBlackHole`**: Phase6の実統合先(いずれも実在確認済み)。
- **`armd-01.sakura.ne.jp/tiles/`(ユーザー提示)**: PMTiles配信の直接の技術的前例。ただし利用規約により直接参照はしない。

**優先度注記:** 中〜大規模だが各要素技術(Open-Meteo/PMTiles/MapLibre GL JS/MCP)はいずれも実績のある技術であり、手堅い。最大の不確実性はPhase6のVRChat/Unity同期における「UdonSharpからの外部HTTP通信の実現可能性」(VRChatのセキュリティサンドボックス制約)であり、Phase6着手前に技術検証(スパイク)を行うべきである。
