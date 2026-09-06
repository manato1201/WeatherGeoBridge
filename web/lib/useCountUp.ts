"use client";

import { useEffect, useRef, useState } from "react";

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// 数値が変わるたびに、前の値から新しい値へアニメーションしながらカウントする。
// requestAnimationFrameのみで実装(新規依存を追加しない)。
export function useCountUp(target: number, durationMs = 600): number {
  const [value, setValue] = useState(target);
  // 常に「直近に画面へ描画した値」を指すref。effect完了時だけでなく毎tick
  // 更新することで、アニメーション途中でtargetが再度変わった場合(例: 更新
  // ボタンを連打した場合)でも、現在表示中の値から続きを描き始められる。
  // (以前はアニメーション完了時にしか更新しておらず、未完了のまま次の
  // アニメーションが始まると数値が古い開始値へ逆戻りして見えるバグがあった)
  const valueRef = useRef(target);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const from = valueRef.current;
    if (from === target) return;

    if (prefersReducedMotion()) {
      valueRef.current = target;
      setValue(target);
      return;
    }

    const start = performance.now();
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);

    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(1, elapsed / durationMs);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = from + (target - from) * eased;
      valueRef.current = current;
      setValue(current);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, durationMs]);

  return value;
}
