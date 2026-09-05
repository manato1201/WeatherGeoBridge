"use client";

import { useState } from "react";
import { urlBase64ToUint8Array } from "@/lib/vapid";

type Status = "idle" | "working" | "subscribed" | "error";

export function NotificationOptIn() {
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [notifyPrecipitation, setNotifyPrecipitation] = useState(true);
  const [temperatureSwingThresholdC, setTemperatureSwingThresholdC] = useState(5);

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

      // 既存の購読があればそれをそのまま使う(なければ新規購読)。
      // Worker側はendpointをキーに上書き保存するので、既存購読に対して
      // 条件だけ変えて再送信すれば設定の更新として機能する。
      const existing = await registration.pushManager.getSubscription();
      const subscription =
        existing ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        }));

      const subscribeRes = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...subscription.toJSON(),
          preferences: { notifyPrecipitation, temperatureSwingThresholdC },
        }),
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
    <div className="card" style={{ display: "flex", flexDirection: "column", gap: "var(--space-12)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-12)" }}>
        <div>
          <p className="section__heading" style={{ fontSize: "var(--text-body-lg)" }}>
            通知
          </p>
          <p className="text-muted" style={{ fontSize: "var(--text-caption)", margin: 0 }}>
            条件に合致した天気変化をWeb Pushで通知します
          </p>
        </div>
        {status === "subscribed" && <span className="badge badge--solid">購読済み</span>}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-8)" }}>
        <label style={{ display: "flex", alignItems: "center", gap: "var(--space-8)", fontSize: "var(--text-body)" }}>
          <input
            type="checkbox"
            checked={notifyPrecipitation}
            onChange={(e) => setNotifyPrecipitation(e.target.checked)}
          />
          降水開始を通知する
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: "var(--space-8)", fontSize: "var(--text-body)" }}>
          気温が
          <input
            type="number"
            className="input"
            style={{ width: 64 }}
            min={0.5}
            step={0.5}
            value={temperatureSwingThresholdC}
            onChange={(e) => setTemperatureSwingThresholdC(Number(e.target.value) || 5)}
          />
          ℃以上変化したら通知する
        </label>
      </div>

      <button className="btn btn--secondary" onClick={subscribe} type="button" disabled={status === "working"}>
        {status === "subscribed" ? "設定を更新" : "通知を受け取る"}
      </button>

      {message && (
        <p className="text-destructive" style={{ fontSize: "var(--text-caption)", margin: 0 }}>
          {message}
        </p>
      )}
    </div>
  );
}
