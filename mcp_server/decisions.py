"""判断ツール(IMPROVEMENT_PLAN_2026-10.md W2)のルール本体。

外部通信をしない純粋関数にして、境界値(降水確率50%など)を単体テストできるようにする。
最初はルールベース。判断専用モデルへ差し替える場合は、同じ入出力の関数を
`DECIDERS` に登録し直すだけで済むよう、MCPツール側はこのモジュールの関数しか呼ばない。

**返す確率について**: `rain_probability_percent` は、このルールの「確からしさ」ではなく、
Open-Meteoの降水確率(予報)から取った値そのもの(対象時間内の最大値)である。
ルールは「その確率がしきい値以上か」を機械的に判定しているだけで、予報が外れる可能性は
その確率の外側に残る。予報であって保証ではない。
"""

from __future__ import annotations

from typing import Any, Callable

UMBRELLA_THRESHOLD_PERCENT = 50
LAUNDRY_THRESHOLD_PERCENT = 30
LAUNDRY_MAX_HUMIDITY_PERCENT = 85

MIN_HOURS = 1
MAX_HOURS = 24

BASIS_NOTE = (
    "rain_probability_percentはOpen-Meteoの降水確率(予報)の最大値に由来する。"
    "ルールの確からしさではなく、予報であって保証ではない。"
)


def _window(hourly: list[dict[str, Any]], hours: int) -> tuple[list[dict[str, Any]], int | None]:
    """先頭`hours`時間のうち降水確率が取れた点と、その最大値を返す。"""
    if not MIN_HOURS <= hours <= MAX_HOURS:
        raise ValueError(f"hoursは{MIN_HOURS}〜{MAX_HOURS}で指定してください")
    points = [p for p in hourly[:hours] if p.get("precipitationProbabilityPercent") is not None]
    if not points:
        return [], None
    return points, max(p["precipitationProbabilityPercent"] for p in points)


def _peak_time(points: list[dict[str, Any]], peak: int | None) -> str | None:
    for p in points:
        if p["precipitationProbabilityPercent"] == peak:
            return p.get("time")
    return None


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


# 判断専用モデルへ差し替える口。同じ入出力の関数をここへ登録し直す。
DECIDERS: dict[str, Callable[..., dict[str, Any]]] = {
    "umbrella": decide_umbrella,
    "laundry": decide_laundry,
}
