"""Web Push購読情報の永続化(個人開発規模のためDBは使わず単一JSONファイル)。"""

from __future__ import annotations

import json
import threading
from pathlib import Path

_STORE_PATH = Path(__file__).parent.parent / "data" / "push_subscriptions.json"
_lock = threading.Lock()


def _load() -> list[dict]:
    if not _STORE_PATH.exists():
        return []
    with _STORE_PATH.open("r", encoding="utf-8") as f:
        return json.load(f)


def _save(subscriptions: list[dict]) -> None:
    _STORE_PATH.parent.mkdir(parents=True, exist_ok=True)
    with _STORE_PATH.open("w", encoding="utf-8") as f:
        json.dump(subscriptions, f, ensure_ascii=False, indent=2)


def add(subscription: dict) -> None:
    """購読情報(PushSubscription.toJSON()相当)を追加する。endpoint重複は無視する。"""
    with _lock:
        subscriptions = _load()
        endpoint = subscription.get("endpoint")
        if any(s.get("endpoint") == endpoint for s in subscriptions):
            return
        subscriptions.append(subscription)
        _save(subscriptions)


def remove(endpoint: str) -> None:
    with _lock:
        subscriptions = [s for s in _load() if s.get("endpoint") != endpoint]
        _save(subscriptions)


def list_all() -> list[dict]:
    with _lock:
        return _load()
