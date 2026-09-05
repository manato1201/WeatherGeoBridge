"""Open-Meteo Forecast API クライアント(WeatherGeoBridge_DESIGN.md Phase1)。

APIキー不要・追加依存なし(urllib.request のみ)で動作する。他プロジェクトへ
そのままコピーして使える前提を成立させるため、外部ライブラリに依存しない。
"""

from __future__ import annotations

import json
import urllib.error
import urllib.parse
import urllib.request

BASE_URL = "https://api.open-meteo.com/v1/forecast"
_TIMEOUT_SECONDS = 10


class WeatherClientError(RuntimeError):
    pass


def _get(params: dict) -> dict:
    url = f"{BASE_URL}?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(url, method="GET")
    try:
        with urllib.request.urlopen(req, timeout=_TIMEOUT_SECONDS) as resp:
            return json.loads(resp.read())
    except urllib.error.URLError as exc:
        raise WeatherClientError(f"Open-Meteoへの接続に失敗しました: {exc}") from exc


def fetch_current(lat: float, lon: float) -> dict:
    """現在の天気(raw Open-Meteoレスポンス)を取得する。"""
    return _get({
        "latitude": lat,
        "longitude": lon,
        "current": "temperature_2m,precipitation,weather_code,wind_speed_10m",
        "timezone": "Asia/Tokyo",
    })


def fetch_forecast(lat: float, lon: float, days: int = 3) -> dict:
    """数日分の予報(raw Open-Meteoレスポンス)を取得する。"""
    days = max(1, min(16, days))
    return _get({
        "latitude": lat,
        "longitude": lon,
        "daily": "temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code",
        "forecast_days": days,
        "timezone": "Asia/Tokyo",
    })
