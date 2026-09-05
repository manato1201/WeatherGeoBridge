"use client";

import { useState } from "react";
import { urlBase64ToUint8Array } from "@/lib/vapid";

type Status = "idle" | "working" | "subscribed" | "error";

export function NotificationOptIn() {
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function subscribe() {
    setStatus("working");
    setMessage(null);
    try {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        throw new Error("このブラウザはWeb Pushに対応していません。");
      }

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        throw new Error("通知の許可が得られませんでした。");
      }

      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      const keyRes = await fetch("/api/push/vapid-public-key");
      const { publicKey } = await keyRes.json();
      if (!publicKey) {
        throw new Error("サーバー側のVAPID公開鍵が未設定です。");
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      const subscribeRes = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });
      if (!subscribeRes.ok) {
        throw new Error("購読登録に失敗しました。");
      }

      setStatus("subscribed");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "不明なエラーが発生しました。");
    }
  }

  return (
    <div>
      <button onClick={subscribe} type="button" disabled={status === "working" || status === "subscribed"}>
        {status === "subscribed" ? "通知購読済み" : "降水・気温急変の通知を受け取る"}
      </button>
      {message && <p style={{ color: "crimson", fontSize: 12 }}>{message}</p>}
    </div>
  );
}
