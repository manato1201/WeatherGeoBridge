#!/usr/bin/env python3
"""WeatherGeoBridge MCPサーバー(WeatherGeoBridge_DESIGN.md Phase5)。

stateless設計: セッションIDを持たず、各tool呼び出しは引数(lat/lon/days/api_key)
のみで完結する。天気取得ロジックは自前実装せず、Cloudflare Workers上の
REST API(worker/)をHTTP経由で呼び出すだけの薄いクライアントとする
(Phase5設計の「同一プロセス内呼び出しでも可」の代わりに、実際に稼働する
公開REST APIを呼ぶ構成に統一し、ロジックの二重実装を避ける)。

認証: 各tool呼び出しの`api_key`引数をそのままWorker側への`X-API-Key`
ヘッダとして転送する。Workerと同じ認証方式を踏襲している。

Usage:
    WEATHERGEOBRIDGE_WORKER_URL=https://<worker>.workers.dev python -m mcp_server.server
"""

from __future__ import annotations

import json
import os
import urllib.error
import urllib.parse
import urllib.request

from mcp.server.mcpserver import MCPServer

mcp = MCPServer("WeatherGeoBridge")

_WORKER_URL = os.environ.get("WEATHERGEOBRIDGE_WORKER_URL", "http://localhost:8788").rstrip("/")


class WorkerError(RuntimeError):
    """WorkerがエラーレスポンスやHTTPエラーを返した場合の例外。

    呼び出し元(MCPクライアント)がstatus_codeで入力不備(4xx、修正して再試行
    すべき)と上流障害(5xx、リトライすべき)を区別できるよう、ステータス
    コードを構造化して保持する(一律RuntimeErrorに潰さない)。
    """

    def __init__(self, message: str, status_code: int | None = None):
        super().__init__(message)
        self.status_code = status_code


def _get(path: str, params: dict, api_key: str) -> dict:
    url = f"{_WORKER_URL}{path}?{urllib.parse.urlencode(params)}"
    # Cloudflareのボット対策(bot fight mode等)がデフォルトの
    # "Python-urllib/x.y" User-Agentを遮断する(HTTP 403 / error 1010)ため、
    # 素性を明示した固有のUser-Agentを送る。
    req = urllib.request.Request(
        url,
        headers={"X-API-Key": api_key, "User-Agent": "WeatherGeoBridge-MCP/1.0"},
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as exc:
        if exc.code == 401:
            raise PermissionError("X-API-Keyの認証に失敗しました(api_keyが不正です)。") from exc
        body = exc.read().decode(errors="replace")
        try:
            message = json.loads(body).get("error", body)
        except json.JSONDecodeError:
            message = body
        raise WorkerError(f"Workerがエラーを返しました({exc.code}): {message}", status_code=exc.code) from exc
    except urllib.error.URLError as exc:
        raise WorkerError(f"Workerへの接続に失敗しました: {exc}") from exc


@mcp.tool()
def get_weather(lat: float, lon: float, api_key: str = "") -> dict:
    """指定した緯度経度の現在の天気を取得する。"""
    return _get("/api/weather", {"lat": lat, "lon": lon}, api_key)


@mcp.tool()
def get_forecast(lat: float, lon: float, days: int = 3, api_key: str = "") -> dict:
    """指定した緯度経度の数日先までの予報を取得する(daysは1〜16)。"""
    return _get("/api/weather/forecast", {"lat": lat, "lon": lon, "days": days}, api_key)


if __name__ == "__main__":
    mcp.run()
