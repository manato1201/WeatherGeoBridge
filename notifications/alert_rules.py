"""差分ベースのアラート判定(WeatherGeoBridge_DESIGN.md Phase2)。

新規の監視インフラ(独自ポーリング等)は作らず、cache.weather_cache が
Open-Meteoへ実フェッチしたタイミングでのみ、直前値との差分を判定する。
"""

from __future__ import annotations

from dataclasses import dataclass

from core.models import WeatherObservation

TEMPERATURE_SWING_THRESHOLD_C = 5.0


@dataclass(frozen=True)
class Alert:
    title: str
    body: str


def check(previous: WeatherObservation | None, current: WeatherObservation) -> list[Alert]:
    """前回観測値と今回観測値を比較し、通知すべきアラートを返す。"""
    if previous is None:
        return []

    alerts: list[Alert] = []

    if previous.precipitation_mm == 0.0 and current.precipitation_mm > 0.0:
        alerts.append(Alert(
            title="降水が始まりました",
            body=f"降水量 {current.precipitation_mm:.1f}mm を検知しました。",
        ))

    temp_delta = current.temperature_c - previous.temperature_c
    if abs(temp_delta) >= TEMPERATURE_SWING_THRESHOLD_C:
        direction = "上昇" if temp_delta > 0 else "下降"
        alerts.append(Alert(
            title="気温が急変しています",
            body=f"前回計測から気温が{abs(temp_delta):.1f}℃{direction}しました。",
        ))

    return alerts
