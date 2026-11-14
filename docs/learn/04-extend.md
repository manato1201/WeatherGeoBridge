# 4. 拡張のレシピ

どのレシピも、**同じ順**で進めます: ①型 → ②入口の検証 → ③本体 → ④ルート(MCP ならツール) → ⑤テスト → ⑥文書。

## レシピ A: エンドポイントを足す(例: 紫外線だけ返す `/api/uv`)

1. **取得**: `worker/src/weather.ts` に `fetchXxx(lat, lon)` を足す。`get(BASE_URL, {...})` を使う(エラーが `WeatherClientError` に揃う)。
2. **型**: `worker/src/types.ts` に、返す形を足す。
3. **入口**: 新しいパラメータがあれば、`validate.ts` に `parseXxx` を足す(**空文字・非数・範囲外**を弾く。`Number("")` の罠は講義 第 2 回)。
4. **ルート**: `index.ts` に、既存と**同じ形**で足す。

```typescript
app.get("/api/uv", requireApiKey, rateLimit, async (c) => {
  const latlon = parseLatLon(c.req.query("lat"), c.req.query("lon"));
  if (!latlon) return c.json({ error: "lat/lonは必須です" }, 400);
  try {
    return c.json(await fetchUv(latlon.lat, latlon.lon));
  } catch (err) {
    const [body, status] = weatherErrorResponse(err);
    return c.json(body, status);
  }
});
```

5. **認証・レート制限を忘れない**(`requireApiKey, rateLimit`)。`/health` のように外へ開く理由が無ければ、必ず付ける。
6. **Next.js 側**: `web/app/api/.../route.ts` を足し、`web/lib/backend.ts` の経由で呼ぶ(**ブラウザから Worker を直接呼ばない**)。
7. **キャッシュが要るか**を決める。Open-Meteo の無料枠を使うので、**同じ値を何度も聞く**ものは、`cache.ts` / `series.ts` の型に倣う(期限は 2 つ持つ)。

## レシピ B: 判断を足す(例: 「風が強いか」)

判断は**純粋関数**です。`mcp_server/decisions.py` に足し、`DECIDERS` に**登録**します。

```python
# 実行できる
from mcp_server.decisions import DECIDERS, decide_umbrella

STRONG_WIND_MS = 10

def decide_wind(wind_speeds_ms, hours=6, threshold_ms=STRONG_WIND_MS):
    """先頭 hours 時間の最大風速がしきい値以上なら yes(例の試作)。"""
    window = [w for w in wind_speeds_ms[:hours] if w is not None]
    if not window:
        return {"question": "wind", "answer": "unknown", "peak_ms": None}
    peak = max(window)
    answer = "yes" if peak >= threshold_ms else "no"
    return {"question": "wind", "answer": answer, "peak_ms": peak}

print(decide_wind([3, 4, 12, 5]))
print(decide_wind([3, 4, 9.9]))
print(decide_wind([None, None]))

extended = {**DECIDERS, "wind": decide_wind}
print(sorted(extended))
print(decide_umbrella([], 0, threshold_percent=80)["evidence"]["threshold_percent"])
```

```text
# 出力
{'question': 'wind', 'answer': 'yes', 'peak_ms': 12}
{'question': 'wind', 'answer': 'no', 'peak_ms': 9.9}
{'question': 'wind', 'answer': 'unknown', 'peak_ms': None}
['laundry', 'umbrella', 'wind']
80
```

実際に足すときの手順:

1. **データがあるか**: いまの `hourly`(`HourlyPoint`)は、気温・降水確率・天気コードだけ。**風速は無い**。`weather.ts` の `HOURLY_PARAMS` と `types.ts` の `HourlyPoint`、`fetchForecast` の整形に**足す**(→ レシピ A)。
2. **ルール**: `decisions.py` に `decide_wind(...)`。**しきい値は定数に**し、`evidence` に使った値と `rule`(人が読める説明)を入れる。**欠けたら `unknown` にするか、無視するか**を決めて、テストに書く(洗濯の湿度は、欠けると無視されている → 既知の問題)。
3. **登録**: `DECIDERS["wind"] = decide_wind`。
4. **ツール**: `server.py` に `@mcp.tool()` の関数を足し、**呼ぶ前に引数を検証**する(`_check_hours` に倣う)。
5. **テスト**: `mcp_server/test_decisions.py` に、**境界値の両側**(`threshold - 1`・`threshold`)を書く。
6. **`basis`**: 「予報であって保証ではない」の一文を、同じように返す。

## レシピ C: 通知の条件を足す(例: 強風で通知)

通知は「事実(`WeatherDiff`)」と「条件(購読者ごとの `NotificationPreferences`)」が分かれています。足す場所は **5 か所**で、**1 か所でも漏れると静かに動きません**。

| # | 場所 | 足すもの |
|---|---|---|
| 1 | `types.ts` | `NotificationPreferences` に項目(例: `windThresholdMs`) |
| 2 | `alerts.ts` | `DEFAULT_PREFERENCES` の既定値・`WeatherDiff` の項目・`computeDiff`・`buildAlerts` |
| 3 | **`validate.ts` の `parsePreferences`** | **項目の検証と既定値**(ここに足さないと、購読時に**捨てられる**) |
| 4 | `web/` の購読画面 | 設定の入力(購読時に送る) |
| 5 | 文書 | この資料の通知の節 |

- **観測に風速が要る**: `WeatherObservation`(`windSpeedMs`)にはある。`computeDiff` が `previous` と `current` を比べる。
- **既存の購読者**は、古い形で保存されている。`push.ts` は `subscription.preferences ?? DEFAULT_PREFERENCES` で読む。**項目が欠けていても動く**ように、`buildAlerts` で既定値を使う。
- 通知の文面は、**数字に単位**を付ける(既存は `mm`・`℃`)。

## レシピ D: キャッシュの期限を変える

`cache.ts` の `TTL_SECONDS`(使える)と `KV_ENTRY_EXPIRATION_SECONDS`(捨てる)。**後者は、必ず前者より大きく**(でないと、直前値が消えて、差分の通知が静かに止まる)。起動時の検査が、直し間違いを**例外で止める**。系列(`series.ts`)は、`FRESH_SECONDS`・`STORAGE_SECONDS` で別に持っている。

## レシピ E: 送信先のプッシュサービスを足す

`validate.ts` の `PUSH_HOSTS`・`PUSH_HOST_SUFFIXES` に、**ホスト名**を足す。任意の URL を許すと、Worker に任意のホストへ署名つきで POST させられるので、**足すのは確かなサービスだけ**。`isAllowedPushEndpoint` は https・443・資格情報なし・長さ 2048 以下も検査する。

## 足したら、必ずやること

1. `python -m unittest mcp_server.test_decisions`(判断を触ったとき)。
2. `python tools/check_docs.py`(文書の引用・実行例が、ソースと合っているか)。
3. Worker を触ったら、`wrangler dev` で**手元で叩く**(TypeScript のテストは、このリポジトリに無い → [テスト](05-testing.md))。
