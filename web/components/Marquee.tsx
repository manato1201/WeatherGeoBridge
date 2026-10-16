"use client";

import { useState, type ReactNode } from "react";

// 横に流れるティッカー(Motion 16)。停止ボタンを必ず付ける(WCAG 2.2.2)。
// prefers-reduced-motion のときはCSS側で流れず、折り返して静止表示になる。
// 内容は2回描画してループさせ、複製側は支援技術から隠す。
export function Marquee({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  const [paused, setPaused] = useState(false);
  return (
    <div className="marquee" role="region" aria-label={label}>
      <div
        className="marquee__viewport"
        data-paused={paused ? "true" : "false"}
      >
        <div className="marquee__track">
          <div className="marquee__group">{children}</div>
          <div className="marquee__group" aria-hidden="true">
            {children}
          </div>
        </div>
      </div>
      <button
        type="button"
        className="btn btn--outline marquee__toggle"
        aria-pressed={paused}
        onClick={() => setPaused((p) => !p)}
      >
        {paused ? "▶ 流す" : "❚❚ 止める"}
      </button>
    </div>
  );
}
