"""Web Push送信(pywebpush)。Service Worker(web/public/sw.js)のpushイベントを起動する。"""

from __future__ import annotations

import json
import os

from notifications import subscriptions_store
from notifications.alert_rules import Alert

try:
    from pywebpush import WebPushException, webpush
    _PYWEBPUSH_AVAILABLE = True
except ImportError:
    _PYWEBPUSH_AVAILABLE = False


def _vapid_claims() -> dict:
    subject = os.environ.get("VAPID_SUBJECT", "mailto:example@example.com")
    return {"sub": subject}


def send_alerts(alerts: list[Alert]) -> None:
    """全購読者にアラートを送信する。購読者0件・VAPID鍵未設定なら何もしない。"""
    if not alerts:
        return
    if not _PYWEBPUSH_AVAILABLE:
        print("[push_sender] pywebpush未インストールのため通知をスキップしました。", flush=True)
        return

    private_key = os.environ.get("VAPID_PRIVATE_KEY", "")
    if not private_key:
        print("[push_sender] VAPID_PRIVATE_KEY未設定のため通知をスキップしました。", flush=True)
        return

    subscriptions = subscriptions_store.list_all()
    if not subscriptions:
        return

    for alert in alerts:
        payload = json.dumps({"title": alert.title, "body": alert.body})
        for sub in subscriptions:
            try:
                webpush(
                    subscription_info=sub,
                    data=payload,
                    vapid_private_key=private_key,
                    vapid_claims=_vapid_claims().copy(),
                )
            except WebPushException as exc:
                status = getattr(exc.response, "status_code", None)
                if status in (404, 410):
                    subscriptions_store.remove(sub.get("endpoint", ""))
                else:
                    print(f"[push_sender] 送信失敗: {exc}", flush=True)
