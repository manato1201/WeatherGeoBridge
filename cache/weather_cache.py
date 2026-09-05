"""TTL付き天気キャッシュ(WeatherGeoBridge_DESIGN.md Phase1)。

同一地点(緯度経度を小数点2桁に丸めたキー、約1.1km四方の粒度)への頻繁な
問い合わせを避ける。キャッシュミスで実フェッチが発生した際は、直前の観測値
との差分をnotifications.alert_rulesへ渡し、該当すればWeb Pushを送る
(Phase2のアラート機能。新規の監視インフラは作らずここにフックする)。
"""

from __future__ import annotations

import threading
import time
from dataclasses import dataclass

from core import weather_client
from core.models import WeatherObservation
from core.weather_normalizer import normalize
from notifications import alert_rules, push_sender


@dataclass
class _CacheEntry:
    observation: WeatherObservation
    fetched_at: float


class WeatherCache:
    def __init__(self, ttl_seconds: int = 600) -> None:
        self.ttl_seconds = ttl_seconds
        self._store: dict[str, _CacheEntry] = {}
        self._lock = threading.Lock()

    @staticmethod
    def _round_key(lat: float, lon: float) -> str:
        return f"{lat:.2f},{lon:.2f}"

    def get_or_fetch(self, lat: float, lon: float) -> WeatherObservation:
        key = self._round_key(lat, lon)
        now = time.time()

        with self._lock:
            entry = self._store.get(key)
            if entry and (now - entry.fetched_at) < self.ttl_seconds:
                return entry.observation
            previous = entry.observation if entry else None

        raw = weather_client.fetch_current(lat, lon)
        observation = normalize(raw, lat, lon)

        with self._lock:
            self._store[key] = _CacheEntry(observation=observation, fetched_at=now)

        alerts = alert_rules.check(previous, observation)
        if alerts:
            push_sender.send_alerts(alerts)

        return observation


# モジュールレベルの共有インスタンス。server/・mcp_server/ の双方がこれを
# 経由することで、REST APIとMCPで天気取得ロジック・キャッシュ状態を二重に
# 持たない(Phase0/Phase5のアンチパターン回避)。
default_cache = WeatherCache()
