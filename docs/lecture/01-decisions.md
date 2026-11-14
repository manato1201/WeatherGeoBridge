# 第 1 回 判断ルール(純粋関数と境界値)

> 所要時間の目安: 2.5 時間 / 前提: 第 0 回・Python の基本

## この回のゴール

- 「傘は要るか」「洗濯物は外に出せるか」の**ルール**を読んで、境界値を説明できる。
- **`unknown`(分からない)**を、`yes` / `no` と別に持つ理由を説明できる。
- 返す「確率」が**ルールの確からしさではない**ことを説明できる。
- 判断を**差し替えられる**作り(`DECIDERS`)を説明できる。

## 1. 傘は要るか

```python
# 引用: mcp_server/decisions.py::decide_umbrella
def decide_umbrella(
    hourly: list[dict[str, Any]],
    current_precipitation_mm: float,
    hours: int = 6,
    threshold_percent: int = UMBRELLA_THRESHOLD_PERCENT,
) -> dict[str, Any]:
    """「傘は要るか」。いま降っている、または対象時間内の降水確率がしきい値以上ならyes。"""
    points, peak = _window(hourly, hours)
    raining_now = current_precipitation_mm > 0
    if peak is None and not raining_now:
        answer = "unknown"
    elif raining_now or (peak is not None and peak >= threshold_percent):
        answer = "yes"
    else:
        answer = "no"
    return {
        "question": "umbrella",
        "answer": answer,
        "rain_probability_percent": peak,
        "evidence": {
            "window_hours": hours,
            "points_used": len(points),
            "peak_time": _peak_time(points, peak),
            "current_precipitation_mm": current_precipitation_mm,
            "raining_now": raining_now,
            "rule": f"いま降水がある、または降水確率の最大値が{threshold_percent}%以上ならyes",
            "threshold_percent": threshold_percent,
        },
        "basis": BASIS_NOTE,
    }
```

- **対象時間**(`hours`、1〜24)の降水確率の**最大値**を見る。範囲外は `ValueError`。
- **いま降っている**(`current_precipitation_mm > 0`)、または最大値が**しきい値(50%)以上**なら `yes`。
- 降水確率が**1 つも取れず**、いま降ってもいないなら `unknown`。
- 結果には、**根拠**(`evidence`: 何時間見たか・最大値の時刻・適用したルール)を付ける。

```python
# 実行できる
from mcp_server.decisions import decide_umbrella


def hourly(*probs):
    return [{"time": f"2026-10-09T{12 + i:02d}:00", "precipitationProbabilityPercent": p} for i, p in enumerate(probs)]


cases = {
    "49%(しきい値の手前)": (hourly(49), 0),
    "50%(ちょうど)": (hourly(50), 0),
    "確率は低いが、いま降っている": (hourly(0, 0), 0.5),
    "窓の外(7 時間目)だけ高い": (hourly(10, 20, 30, 10, 10, 10, 90), 0),
    "確率が取れない": (hourly(None, None), 0),
    "データなし": ([], 0),
}
for label, (data, now) in cases.items():
    r = decide_umbrella(data, now)
    print(f"{label:22} → {r['answer']:7} 確率={r['rain_probability_percent']}")
print("窓を 7 時間にすると:", decide_umbrella(hourly(10, 20, 30, 10, 10, 10, 90), 0, hours=7)["answer"])
```

```text
# 出力
49%(しきい値の手前)           → no      確率=49
50%(ちょうど)              → yes     確率=50
確率は低いが、いま降っている         → yes     確率=0
窓の外(7 時間目)だけ高い         → no      確率=30
確率が取れない                → unknown 確率=None
データなし                  → unknown 確率=None
窓を 7 時間にすると: yes
```

注目: **50% ちょうどは yes**(`>=`)。**窓の外**の高い確率は見ない。確率が**取れない**ときは、`no` ではなく **`unknown`**。

> **`unknown` を分ける理由**: 「データが無い」を「降らない」(`no`)と答えると、**傘を持たずに濡れる**。分からないことは、分からないと答える(偽の安心を出さない)。

## 2. 洗濯物は外に出せるか

```python
# 引用: mcp_server/decisions.py::decide_laundry
def decide_laundry(
    hourly: list[dict[str, Any]],
    current_precipitation_mm: float,
    current_humidity_percent: float | None,
    hours: int = 6,
    threshold_percent: int = LAUNDRY_THRESHOLD_PERCENT,
    max_humidity_percent: int = LAUNDRY_MAX_HUMIDITY_PERCENT,
) -> dict[str, Any]:
    """「洗濯物を外に出せるか」。降水確率が低く、いま降っておらず、湿度が高すぎなければyes。"""
    points, peak = _window(hourly, hours)
    raining_now = current_precipitation_mm > 0
    too_humid = current_humidity_percent is not None and current_humidity_percent > max_humidity_percent
    if peak is None:
        answer = "unknown"
    elif raining_now or peak >= threshold_percent or too_humid:
        answer = "no"
    else:
        answer = "yes"
    return {
        "question": "laundry",
        "answer": answer,
        "rain_probability_percent": peak,
        "evidence": {
            "window_hours": hours,
            "points_used": len(points),
            "peak_time": _peak_time(points, peak),
            "current_precipitation_mm": current_precipitation_mm,
            "raining_now": raining_now,
            "current_humidity_percent": current_humidity_percent,
            "too_humid": too_humid,
            "rule": (
                f"降水確率の最大値が{threshold_percent}%未満、いま降水なし、"
                f"湿度{max_humidity_percent}%以下ならyes"
            ),
            "threshold_percent": threshold_percent,
            "max_humidity_percent": max_humidity_percent,
        },
        "basis": BASIS_NOTE,
    }
```

`yes` になるのは、降水確率の最大値が **30% 未満**、**いま降っていない**、**湿度が 85% 以下**の**すべて**を満たすとき。どれか 1 つでも外れれば `no`(確率が取れなければ `unknown`)。傘より**厳しい**(確率のしきい値が低い)のは、**外に出して濡れる損**が大きいから。

```python
# 実行できる
from mcp_server.decisions import decide_laundry


def hourly(*probs):
    return [{"time": f"2026-10-09T{12 + i:02d}:00", "precipitationProbabilityPercent": p} for i, p in enumerate(probs)]


for label, args in {
    "29%・湿度 60%": (hourly(29), 0, 60),
    "30%・湿度 60%": (hourly(30), 0, 60),
    "0%・湿度 85%": (hourly(0), 0, 85),
    "0%・湿度 86%": (hourly(0), 0, 86),
    "0%・湿度が分からない": (hourly(0), 0, None),
}.items():
    r = decide_laundry(*args)
    print(f"{label:20} → {r['answer']:3}  too_humid={r['evidence']['too_humid']}")
```

```text
# 出力
29%・湿度 60%           → yes  too_humid=False
30%・湿度 60%           → no   too_humid=False
0%・湿度 85%            → yes  too_humid=False
0%・湿度 86%            → no   too_humid=True
0%・湿度が分からない          → yes  too_humid=False
```

注目: **湿度が分からない(`None`)ときは、湿度を判定に入れない**(降水の条件だけで決まる)。データが欠けたとき、どちらに倒すかは**設計の判断**で、ここでは「あるデータだけで決める」です。

## 3. 返す「確率」の意味

`rain_probability_percent` は、**ルールの確からしさではありません**。Open-Meteo の**降水確率(予報)の最大値**を、そのまま返しています。ルールは、その値が**しきい値以上か**を機械的に見ているだけで、**予報が外れる可能性**は、その外側に残ります。だから、結果には `basis`(「予報であって保証ではない」)を必ず付けます。

## 4. 差し替えられる作り

```python
# 抜粋ファイル: mcp_server/decisions.py
DECIDERS: dict[str, Callable[..., dict[str, Any]]] = {
    "umbrella": decide_umbrella,
    "laundry": decide_laundry,
}
```

MCP のツール側は、**`DECIDERS` の関数だけ**を呼びます。判断専用のモデルに替えたいときは、**同じ入出力の関数**を登録し直すだけ(ツール側は変えない)。

## 確認問題

1. 降水確率が 50% ちょうどのとき、傘の答えは何ですか。なぜ、境界を単体テストするのですか。
2. データが無いとき、`no` でなく `unknown` を返すのは、なぜですか。
3. `rain_probability_percent` を、「このルールの確からしさ」と読んではいけないのは、なぜですか。
4. 洗濯のしきい値(30%)が、傘(50%)より低いのは、なぜですか。

## 解答

1. `yes`(`>=`)。境界は**1 つずれるだけで答えが変わる**ので、「ちょうど」「1 つ手前」を、テストで固定する。
2. 「降らない」と誤って安心させないため。分からないことは、分からないと伝える。
3. 予報の降水確率の**値そのもの**で、ルールの正しさを表すものではないから。予報は外れうる。
4. 外に出した洗濯物が濡れる損のほうが、傘を持ち歩く手間より大きいから。

## まとめ

- 判断は**外部通信のない純粋関数**。境界値(50% ちょうど・窓の外・湿度の境界)を、テストで固定する。
- **`unknown`** を持つ。確率は**予報値のまま**返し、根拠と注意書きを付ける。
- `DECIDERS` で、判断を差し替えられる。
- 次の回は、Worker 側の設計(キャッシュ・入力の検証・間引き)。
