# 7. 基礎の補強(言語・設計思想・アルゴリズム・用語)

講義と学習資料の**前提になっている知識**を、ここで補います。このリポジトリは **TypeScript(Worker・Web)と Python(MCP)の 2 言語**です。それぞれ**実際に使われている形**で、動かして確かめます(TypeScript の考え方は、型を外した JavaScript で試します)。

## 1. 言語の基礎

### 1.1 TypeScript / JavaScript: 型・`async/await`・`Promise`

TypeScript は、JavaScript に**型**を足したもの(実行時には、型は消える)。`interface` は**オブジェクトの形の約束**。**ネットワークの呼び出しは非同期**で、`await` で結果を待つ(その間、他の仕事が進む)。`Promise.allSettled` は、**1 つが失敗しても、全部の結果を集める**(定期ジョブが、地点ごとの失敗で止まらないために使う)。

```javascript
// 実行できる
async function fetchWeather(place) {
  await new Promise((resolve) => setTimeout(resolve, 5));          // 通信を待つ、の代わり
  if (place === "壊れた地点") throw new Error("Open-Meteo が 502 を返した");
  return { place, temperatureC: 20 };
}

(async () => {
  const places = ["東京", "壊れた地点", "大阪"];
  const results = await Promise.allSettled(places.map((p) => fetchWeather(p)));   // 1 つ落ちても、全部の結果が揃う
  for (const [i, r] of results.entries()) {
    console.log(places[i], r.status, r.status === "fulfilled" ? r.value.temperatureC : r.reason.message);
  }
})();
```

```text
# 出力
東京 fulfilled 20
壊れた地点 rejected Open-Meteo が 502 を返した
大阪 fulfilled 20
```

- 逆に `Promise.all` は、**1 つでも失敗すると全体が失敗**する。**独立した仕事**には `allSettled`。

### 1.2 `Map`・`Set`・グループ化(通知の「地点ごと」)

定期ジョブは、購読者を**地点のキーでまとめ**、**地点ごとに 1 回だけ**天気を取る。`Map` は、**キーから値**の表(キーに、文字列以外も使える)。

```javascript
// 実行できる
const roundKey = (lat, lon) => `weather:${lat.toFixed(2)},${lon.toFixed(2)}`;     // 小数 2 桁に丸める

const subscribers = [
  { id: "a", lat: 35.6895, lon: 139.6917 },
  { id: "b", lat: 35.6901, lon: 139.6921 },     // 東京の、ほぼ同じ場所
  { id: "c", lat: 34.6937, lon: 135.5023 },     // 大阪
];
const groups = new Map();
for (const s of subscribers) {
  const key = roundKey(s.lat, s.lon);
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(s.id);
}
console.log([...groups.entries()]);
console.log("取得する回数(地点の数):", groups.size, "/ 購読者:", subscribers.length);
```

```text
# 出力
[
  [ 'weather:35.69,139.69', [ 'a', 'b' ] ],
  [ 'weather:34.69,135.50', [ 'c' ] ]
]
取得する回数(地点の数): 2 / 購読者: 3
```

### 1.3 暗号の部品: ハッシュと一定時間の比較(Web Crypto)

Worker には Node の `crypto` が無く、**Web 標準の `crypto.subtle`** を使う。購読の保存キーは、**endpoint の SHA-256**。API キーの比較は、**両方をハッシュにしてから、全バイトを比べる**(長さや一致位置が、応答時間に出ない)。

```javascript
// 実行できる
async function sha256Hex(text) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function safeEqual(a, b) {
  const [da, db] = await Promise.all([crypto.subtle.digest("SHA-256", new TextEncoder().encode(a)), crypto.subtle.digest("SHA-256", new TextEncoder().encode(b))]);
  const va = new Uint8Array(da), vb = new Uint8Array(db);
  let diff = 0;
  for (let i = 0; i < va.length; i++) diff |= va[i] ^ vb[i];             // 全バイトを、必ず見る(途中で止めない)
  return diff === 0;
}

(async () => {
  console.log("SHA-256 の長さ:", (await sha256Hex("https://example/endpoint")).length);
  console.log("同じ鍵:", await safeEqual("secret", "secret"), " 違う鍵:", await safeEqual("secret", "Secret"));
})();
```

```text
# 出力
SHA-256 の長さ: 64
同じ鍵: true  違う鍵: false
```

### 1.4 Python: 純粋関数・辞書・例外(MCP の判断)

`decisions.py` は、**外と通信しない純粋関数**。**入力が同じなら出力も同じ**なので、**境界の値**を並べて、確かめやすい。`hourly[:hours]` は**先頭 hours 個**のスライス。`max(...)` は最大値。不正な入力は `ValueError`。

```python
# 実行できる
from mcp_server.decisions import decide_umbrella

hourly = [{"time": f"12:{i:02d}", "precipitationProbabilityPercent": p} for i, p in enumerate([10, 20, 49, 80])]
for hours in (3, 4):
    r = decide_umbrella(hourly, 0.0, hours=hours)
    print(f"先読み {hours} 時間 → {r['answer']}  最大の降水確率 {r['rain_probability_percent']}%")

try:
    decide_umbrella(hourly, 0.0, hours=0)
except ValueError as error:
    print("範囲外:", error)
```

```text
# 出力
先読み 3 時間 → no  最大の降水確率 49%
先読み 4 時間 → yes  最大の降水確率 80%
範囲外: hoursは1〜24で指定してください
```

## 2. 設計思想

| 原則 | 意味 | このリポジトリのどこに出るか | 破るとどうなるか |
|---|---|---|---|
| **鍵をブラウザに出さない** | 秘密は、サーバー側だけが持つ | Next.js の API ルートが中継 | 鍵が、誰にでも見える |
| **fail-closed** | 設定が足りないとき、閉じる | 鍵が未設定なら 503・CORS は未設定なら全拒否 | 設定漏れが、そのまま穴になる |
| **保存の期限と、使える期限を分ける** | 消える時刻と、使い回す時間は、別 | `TTL_SECONDS`(使える)と KV の保存(7 日) | 通知に要る「直前の値」が消える |
| **事実と条件を分ける** | 検知した差(事実)と、購読者ごとの条件を分ける | `computeDiff` と `buildAlerts` | 全員に同じ通知しか出せない |
| **画面の閲覧を、通知のきっかけにしない** | 無関係な地点の通知を、全員に飛ばさない | 定期ジョブが、購読者の地点だけを調べる | 大阪の人に、東京の通知が届く |
| **判断は純粋関数** | 通信と分けて、境界値をテストする | `mcp_server/decisions.py` | 判断が、通信の失敗と混ざる |
| **確率は予報であって、保証ではない** | 数字の意味を、結果に書く | `basis` | 利用者が、外れを「不具合」と受け取る |
| **入口で検証する** | 外から来る値は、最初に弾く | `validate.ts` | 壊れた値が、奥で謎の失敗になる |

## 3. 関数・アルゴリズム

| 名前 | 場所 | 何をする | 計算量・注意 |
|---|---|---|---|
| **座標の丸め(キー)** | `roundKey` | 小数 2 桁(約 1 km)にして、近い地点を同じキャッシュに | O(1)。**境界の近くの地点は、別のキー**になる |
| **グループ化 + 1 回の取得** | `scheduled.ts` | 購読者を地点でまとめ、地点ごとに取得 | O(購読者数)。取得は地点の数だけ |
| **差分の判定** | `computeDiff`・`buildAlerts` | 前回との差(降り始め・気温の変化)を閾値と比べる | O(1) |
| **最大値による判断** | `decide_umbrella` | 先読み時間内の降水確率の最大が、しきい値以上か | O(hours) |
| **3 時間刻みの間引き** | `pickStepIndices` | 1 時間刻みの列から、3 つおきに取る | O(出力の数) |
| **SHA-256** | `push.ts`・`auth.ts` | 保存のキー・鍵の比較 | O(データ長) |

```javascript
// 実行できる
// 座標を丸めるキャッシュのキー: 近い地点は同じ、境界をまたぐと別
const roundKey = (lat, lon) => `${lat.toFixed(2)},${lon.toFixed(2)}`;
console.log("ほぼ同じ場所:", roundKey(35.6895, 139.6917) === roundKey(35.6899, 139.6921));
console.log("境界をまたぐ:", roundKey(35.6849, 139.6917), "と", roundKey(35.6851, 139.6917), "は別 →", roundKey(35.6849, 139.6917) !== roundKey(35.6851, 139.6917));

// 3 時間刻みの間引き: 0, 3, 6, ... を、配列の範囲内で
const hourly = Array.from({ length: 96 }, (_, i) => i);            // 4 日 × 24 時間
const picked = [];
for (let i = 0; i < 25; i++) {
  const index = 5 + i * 3;                                         // 現在(5 時台)から 3 時間おき
  if (index >= hourly.length) break;
  picked.push(index);
}
console.log("点の数:", picked.length, " 先頭:", picked.slice(0, 4), " 最後:", picked[picked.length - 1]);
```

```text
# 出力
ほぼ同じ場所: true
境界をまたぐ: 35.68,139.69 と 35.69,139.69 は別 → true
点の数: 25  先頭: [ 5, 8, 11, 14 ]  最後: 77
```

## 4. IT の用語の補強

| 用語 | 意味 | このリポジトリでの出番 |
|---|---|---|
| **REST API / HTTP ステータス** | URL と動詞で操作を呼ぶ形 / 200(成功)・400(入力ミス)・401(認証)・429(多すぎる)・502(上流の障害)・503(利用不可) | `worker/src/index.ts` |
| **CORS / Origin** | ブラウザが別のサイトの API を呼べる取り決め / 呼んだ元 | 許可リスト方式 |
| **レート制限** | 一定時間の呼び出し回数の上限 | `RATE_LIMITER` |
| **Cloudflare Workers / KV / Cron** | エッジで動く関数 / 単純な key-value 保存 / 定期実行 | Worker 全体 |
| **エッジ(CDN)** | 利用者の近くで動く配信・実行の拠点 | 低遅延 |
| **キャッシュ / TTL** | 一度取った値の再利用 / その有効期間 | `cache.ts` |
| **Web Push / VAPID / Service Worker** | ブラウザへの通知の仕組み / 送り手を証明する鍵 / 裏で動くスクリプト | 通知 |
| **PWA** | アプリのように入れられる Web サイト | `web/` |
| **Open-Meteo** | 無料の天気 API | データの出どころ |
| **降水確率 / 体感温度 / WMO 天気コード** | 予報の確率 / 風・湿度を加味した温度 / 天気の国際的な数字の分類 | 型 `weatherCode` |
| **MCP** | AI がツールを呼ぶ取り決め | `mcp_server/` |
| **Hono / Next.js / Vercel** | 軽い Web フレームワーク / React のフレームワーク / ホスティング | 構成 |
| **JST / UTC** | 日本標準時 / 世界協定時 | 時刻は JST 固定 |

## 確認問題

1. `Promise.allSettled` を使うのは、どんな場面ですか。`Promise.all` との違いは何ですか。
2. 購読者を地点でまとめてから天気を取るのは、なぜですか。
3. API キーの比較で、ハッシュにしてから全バイトを比べるのは、なぜですか。
4. 「保存の期限」と「使える期限」を分けるのは、なぜですか。

## 解答

1. 独立した仕事で、1 つが失敗しても他を続けたいとき。`all` は 1 つの失敗で全体が失敗する。
2. 同じ地点の購読者が何人いても、外部 API への取得を 1 回にして、負荷と無料枠を節約するため。
3. 長さや一致位置が応答時間に出ず、時間から鍵を推測されないようにするため。
4. 通知に要る「直前の値」が、使える期限(短い)で消えないようにするため。
