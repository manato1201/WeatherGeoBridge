"""X-API-Keyヘッダ認証(WeatherGeoBridge_DESIGN.md Phase4)。

DevelopmentRAGEnvironment/scripts/rag_local_bridge.py が確立した準標準パターン
(X-API-Keyヘッダ方式)を踏襲する。新規の認証方式は発明しない。
"""

from __future__ import annotations

import os


def is_valid_key(api_key: str) -> bool:
    """設定された WEATHERGEOBRIDGE_API_KEY と一致するか検証する。

    環境変数が未設定の場合は認証なし(開発モード)として全て許可する。
    """
    configured = os.environ.get("WEATHERGEOBRIDGE_API_KEY", "")
    if not configured:
        return True
    return api_key == configured
