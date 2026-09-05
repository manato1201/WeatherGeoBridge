#!/usr/bin/env python3
"""WeatherGeoBridge REST APIサーバー(WeatherGeoBridge_DESIGN.md Phase4)。

Phase1の core/・cache/ を薄くラップするだけで、天気取得ロジックを
ここで再実装しない。認証は server/auth.py の X-API-Key 方式を使う。

Usage:
    python -m server.api_server [--port 8787]
"""

from __future__ import annotations

import argparse
import json
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

from cache.weather_cache import default_cache
from core import weather_client
from core.weather_normalizer import normalize_forecast
from notifications import subscriptions_store
from server.auth import is_valid_key

DEFAULT_PORT = 8787


class ApiHandler(BaseHTTPRequestHandler):
    def log_message(self, fmt: str, *args) -> None:  # noqa: A003 - BaseHTTPRequestHandler override
        pass

    # ── 共通ユーティリティ ──────────────────────────────────────────
    def _send_json(self, code: int, obj: dict) -> None:
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def _read_body(self) -> dict:
        length = int(self.headers.get("Content-Length", 0))
        if length == 0:
            return {}
        return json.loads(self.rfile.read(length))

    def _require_auth(self) -> bool:
        api_key = self.headers.get("X-API-Key", "")
        if not is_valid_key(api_key):
            self._send_json(401, {"error": "認証が必要です。X-API-Keyヘッダーを設定してください。"})
            return False
        return True

    @staticmethod
    def _parse_latlon(params: dict) -> tuple[float, float] | None:
        try:
            return float(params["lat"][0]), float(params["lon"][0])
        except (KeyError, ValueError, IndexError):
            return None

    def do_OPTIONS(self) -> None:
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, X-API-Key")
        self.end_headers()

    # ── GET ─────────────────────────────────────────────────────────
    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        path = parsed.path
        params = parse_qs(parsed.query)

        if path == "/health":
            self._send_json(200, {"status": "ok", "server": "weathergeobridge-api"})
            return

        if path == "/api/push/vapid-public-key":
            public_key = os.environ.get("VAPID_PUBLIC_KEY", "")
            self._send_json(200, {"publicKey": public_key})
            return

        if path == "/api/weather":
            if not self._require_auth():
                return
            latlon = self._parse_latlon(params)
            if latlon is None:
                self._send_json(400, {"error": "lat/lonは必須です"})
                return
            lat, lon = latlon
            try:
                observation = default_cache.get_or_fetch(lat, lon)
            except Exception as exc:
                self._send_json(502, {"error": str(exc)})
                return
            self._send_json(200, observation.to_dict())
            return

        if path == "/api/weather/forecast":
            if not self._require_auth():
                return
            latlon = self._parse_latlon(params)
            if latlon is None:
                self._send_json(400, {"error": "lat/lonは必須です"})
                return
            lat, lon = latlon
            days = int(params.get("days", ["3"])[0])
            try:
                raw = weather_client.fetch_forecast(lat, lon, days)
                forecast = normalize_forecast(raw, lat, lon)
            except Exception as exc:
                self._send_json(502, {"error": str(exc)})
                return
            self._send_json(200, forecast.to_dict())
            return

        self._send_json(404, {"error": "Not found"})

    # ── POST ────────────────────────────────────────────────────────
    def do_POST(self) -> None:
        path = urlparse(self.path).path

        if path == "/api/push/subscribe":
            if not self._require_auth():
                return
            body = self._read_body()
            if not body.get("endpoint"):
                self._send_json(400, {"error": "endpointは必須です"})
                return
            subscriptions_store.add(body)
            self._send_json(201, {"ok": True})
            return

        self._send_json(404, {"error": "Not found"})


def main() -> None:
    parser = argparse.ArgumentParser(description="WeatherGeoBridge REST API")
    parser.add_argument("--port", type=int, default=int(os.environ.get("WEATHERGEOBRIDGE_API_PORT", DEFAULT_PORT)))
    args = parser.parse_args()

    if not os.environ.get("WEATHERGEOBRIDGE_API_KEY"):
        print("[api_server] 警告: WEATHERGEOBRIDGE_API_KEY が未設定です。認証なしで動作します(開発モード)。", flush=True)

    server = ThreadingHTTPServer(("localhost", args.port), ApiHandler)
    print(f"[api_server] http://localhost:{args.port} で待機中", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[api_server] 停止中...", flush=True)
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
