"use client";

import { useEffect, useRef } from "react";

export interface AlertMessage {
  title: string;
  body: string;
}

// sw.jsがPush受信時にpostMessageしてくる内容を購読する。新しい監視処理は
// 追加せず、既存のWeb Push配信(=Worker側の差分検知)をそのままトリガーに
// 使う(WeatherGeoBridge_DESIGN.md Phase7の制約)。
export function useServiceWorkerMessages(
  onMessage: (alert: AlertMessage) => void,
): void {
  // MapViewのonPickRefと同じパターン: effect自体はマウント時に1回だけ登録し、
  // コールバックは常に最新のものをrefから読む(親の再レンダーで古い
  // クロージャを掴んだままにしない)。
  const onMessageRef = useRef(onMessage);
  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    function handler(event: MessageEvent) {
      const data = event.data;
      if (
        data &&
        typeof data.title === "string" &&
        typeof data.body === "string"
      ) {
        onMessageRef.current({ title: data.title, body: data.body });
      }
    }

    navigator.serviceWorker.addEventListener("message", handler);
    return () =>
      navigator.serviceWorker.removeEventListener("message", handler);
  }, []);
}
