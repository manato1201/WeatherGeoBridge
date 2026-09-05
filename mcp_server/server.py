#!/usr/bin/env python3
"""WeatherGeoBridge MCPサーバー(WeatherGeoBridge_DESIGN.md Phase5)。

stateless設計: セッションIDを持たず、各tool呼び出しは引数(lat/lon/days/api_key)
のみで完結する。内部実装はcore/・cache/をPhase4のREST APIと共有し、
天気取得ロジックを重複実装しない(同一プロセス内呼び出し)。

認証: stdioトランスポートにはHTTPヘッダが存在しないため、Phase4と同じ
X-API-Key方式を「各tool引数にapi_keyを必須化しserver.auth.is_valid_keyで
照合する」形で踏襲する。HTTPトランスポートに切り替える場合はこの
api_key引数チェックをリクエストヘッダ検証に置き換えるだけでよい。

Usage:
    python -m mcp_server.server
"""

from __future__ import annotations

from mcp.server.mcpserver import MCPServer

from cache.weather_cache import default_cache
from core import weather_client
from core.weather_normalizer import normalize_forecast
from server.auth import is_valid_key

mcp = MCPServer("WeatherGeoBridge")


def _check_api_key(api_key: str) -> None:
    if not is_valid_key(api_key):
        raise PermissionError("X-API-Key相当の認証に失敗しました(api_keyが不正です)。")


@mcp.tool()
def get_weather(lat: float, lon: float, api_key: str = "") -> dict:
    """指定した緯度経度の現在の天気を取得する。"""
    _check_api_key(api_key)
    observation = default_cache.get_or_fetch(lat, lon)
    return observation.to_dict()


@mcp.tool()
def get_forecast(lat: float, lon: float, days: int = 3, api_key: str = "") -> dict:
    """指定した緯度経度の数日先までの予報を取得する(daysは1〜16)。"""
    _check_api_key(api_key)
    raw = weather_client.fetch_forecast(lat, lon, days)
    forecast = normalize_forecast(raw, lat, lon)
    return forecast.to_dict()


if __name__ == "__main__":
    mcp.run()
