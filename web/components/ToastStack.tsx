"use client";

// WeatherGeoBridge_DESIGN.md Phase7-4(スタックトースト)+ 7-5(ピールチケット)。
// フォアグラウンドで受信したPush通知(降水開始・気温急変等)を画面右上に
// 重ねて表示し、上から順にドラッグでめくって消せるようにする。

import { useRef, useState } from "react";

export interface ToastItem {
  id: number;
  title: string;
  body: string;
}

const DISMISS_THRESHOLD_PX = 80;
const EXIT_DURATION_MS = 220;

function PeelToast({
  toast,
  index,
  onDismiss,
}: {
  toast: ToastItem;
  index: number;
  onDismiss: (id: number) => void;
}) {
  const [dragX, setDragX] = useState(0);
  const [dismissing, setDismissing] = useState<"left" | "right" | null>(null);
  const draggingRef = useRef(false);
  const startXRef = useRef(0);

  function dismiss(direction: "left" | "right") {
    setDismissing(direction);
    setTimeout(() => onDismiss(toast.id), EXIT_DURATION_MS);
  }

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (dismissing) return;
    draggingRef.current = true;
    startXRef.current = e.clientX;
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!draggingRef.current) return;
    setDragX(e.clientX - startXRef.current);
  }
  function handlePointerUp() {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    if (Math.abs(dragX) > DISMISS_THRESHOLD_PX) {
      dismiss(dragX > 0 ? "right" : "left");
    } else {
      setDragX(0);
    }
  }

  const stackOffset = index * 10;
  const stackScale = 1 - index * 0.05;
  const transform = dismissing
    ? `translateX(${dismissing === "right" ? "130%" : "-130%"}) rotate(${dismissing === "right" ? 18 : -18}deg)`
    : `translateY(${stackOffset}px) scale(${stackScale}) translateX(${dragX}px) rotate(${dragX * 0.05}deg)`;

  return (
    <div
      className="card"
      role="alert"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        transform,
        transition: draggingRef.current
          ? "none"
          : `transform ${EXIT_DURATION_MS}ms ease, opacity ${EXIT_DURATION_MS}ms ease`,
        opacity: dismissing ? 0 : 1,
        clipPath: dismissing
          ? "polygon(0 0, 100% 0, 100% 100%, 30% 70%)"
          : undefined,
        cursor: "grab",
        touchAction: "pan-y",
        zIndex: 100 - index,
        boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "var(--space-8)",
        }}
      >
        <div>
          <p className="stat-block__label" style={{ margin: 0 }}>
            {toast.title}
          </p>
          <p style={{ margin: "var(--space-4) 0 0" }}>{toast.body}</p>
        </div>
        <button
          type="button"
          className="btn btn--outline"
          style={{ height: 24, width: 24, padding: 0, flexShrink: 0 }}
          onClick={() => dismiss("right")}
          aria-label="通知を閉じる"
        >
          ×
        </button>
      </div>
      <p
        className="text-caption"
        style={{ margin: "var(--space-4) 0 0", opacity: 0.6 }}
      >
        ドラッグして閉じる
      </p>
    </div>
  );
}

export function ToastStack({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: number) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: "var(--space-16)",
        right: "var(--space-16)",
        width: 320,
        maxWidth: "calc(100vw - 32px)",
        zIndex: 1000,
      }}
    >
      <div style={{ position: "relative", minHeight: 96 }}>
        {toasts.slice(0, 5).map((toast, i) => (
          <PeelToast
            key={toast.id}
            toast={toast}
            index={i}
            onDismiss={onDismiss}
          />
        ))}
      </div>
    </div>
  );
}
