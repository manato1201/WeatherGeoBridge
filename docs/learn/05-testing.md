# 5. テストの書き方と実行

## 実行

```bash
python -m unittest mcp_server.test_decisions     # 判断ルールの境界値(標準ライブラリだけ・ネットワーク不要)
python -m pytest -q tests/test_docs.py           # 文書の検査(pytest が要る)
python tools/check_docs.py                       # 同じ検査(標準ライブラリだけ)
```

## 何を確かめているか

| ファイル | 確かめるもの |
|---|---|
| `mcp_server/test_decisions.py` | **傘**: しきい値 49/50/51・窓の外の高い値は無視・窓の内の最大値・降水中は確率が低くても `yes`・データ無しは `unknown`・`hours` が範囲外なら `ValueError`・`basis` に「予報」。**洗濯**: 29/30・湿度 85/86・湿度 `None` は無視・降水中は `no`・予報なしは `unknown` |
| `tests/test_docs.py` | 文書の引用がソースと一致・実行例が 2 回動いて出力が一致・講義の標準の節・リンク・Mermaid の標準行 |

## よく使う型

1. **境界値は、両側を書く**(`49` と `50`)。しきい値の `>=` と `>` の取り違えを、一番早く見つける。
2. **純粋関数にしてあるから、通信なしで試せる**。判断を足すときも、`hourly(...)` のような小さな補助で入力を作る。
3. **「欠けたとき」の挙動をテストに書く**(`None`・空のリスト)。書くと、**倒し方を決めたこと**が残る。
4. **結果の「理由」(`evidence`)も確かめる**: 答えだけでなく、ピーク時刻・使った点の数が合っているか。

## 新しい判断のテストを書く手順

1. **失敗するテストを先に**書く(境界の両側・欠けた入力・範囲外の引数)。
2. 実装して通す。
3. **既存のテストが変わらず通る**ことを確かめる(しきい値の既定値を、うっかり変えていない)。

```python
# 実行できる
import unittest

from mcp_server.decisions import decide_umbrella

def hourly(*probs):
    return [{"time": f"2026-10-09T{12 + i:02d}:00", "precipitationProbabilityPercent": p}
            for i, p in enumerate(probs)]

class Boundary(unittest.TestCase):
    def test_threshold(self):
        self.assertEqual(decide_umbrella(hourly(49), 0)["answer"], "no")
        self.assertEqual(decide_umbrella(hourly(50), 0)["answer"], "yes")

    def test_bad_hours(self):
        with self.assertRaises(ValueError):
            decide_umbrella(hourly(10), 0, hours=25)

import io

result = unittest.TextTestRunner(stream=io.StringIO()).run(
    unittest.defaultTestLoader.loadTestsFromTestCase(Boundary))
print("実行:", result.testsRun, "失敗:", len(result.failures), "エラー:", len(result.errors))
```

```text
# 出力
実行: 2 失敗: 0 エラー: 0
```

## 文書の検査

```bash
python tools/check_docs.py             # 検査(標準ライブラリだけ)
python tools/check_docs.py --update    # 引用の更新・実行例の出力の作り直し
python tools/check_mermaid.py          # Mermaid が描画できるか(mmdc が要る)
python tools/make_diagrams.py          # 構成図(SVG)を作り直す
```

`# 引用:` のブロックは、ソースが変わると**検査が落ちる**(`--update` で直す)。`# 抜粋:` は、各行がそのソースに**この順で**現れることを確かめる。

## 確かめていないこと(正直に)

- **Worker の TypeScript には、テストが無い**。認証・キャッシュ・検証・通知の判定(`alerts.ts`・`validate.ts` など)は、`wrangler dev` で手元から叩いて確かめる運用。**純粋関数が多い**(`computeDiff`・`buildAlerts`・`parseLatLon`・`pickStepIndices`・`buildGrid`)ので、**vitest などで足しやすい**が、未実施。
- **`web/`(Next.js)のテスト**も、この資料の範囲では確かめていない。
- **MCP の `server.py`**(HTTP を呼ぶ部分)の自動テストは無い。判断ルールだけがテスト対象。
- **Cron の実機での動作・Web Push の実際の到達**は、本番の環境でしか確かめられない。
- **Open-Meteo のレスポンスの形が変わったとき**を検知する仕組みは無い(変わると `weather.ts` の読み替えが `undefined` を返す)。
