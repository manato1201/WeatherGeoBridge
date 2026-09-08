"use client";

// WeatherGeoBridge_DESIGN.md Phase7-3(スプリットフラップ)。
// flipKeyが変わるたびにフリップして新しい値へ切り替える。値そのものの
// 変化を独自に監視するのではなく、呼び出し元(page.tsx)がPush通知受信
// (=既存の差分検知トリガー)の度にflipKeyをインクリメントする設計にして
// おり、ここでは新しい監視処理を増やしていない。

import { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "@/lib/usePrefersReducedMotion";

// globals.cssの.flap-digitのtransition時間(0.3s)と一致させる。CSS変数化
// すると、reduced-motion時に「0sで一瞬だけ真横向きの無表示状態」が挟まる
// (アニメーションなしとは違う、一瞬のちらつき)ため、reduced-motionの
// 分岐自体はJS側で明示的に行い、CSSの時間は固定値で揃えている。
const FLIP_HALF_MS = 300;

export function SplitFlapValue({
  value,
  flipKey,
}: {
  value: string;
  flipKey: number;
}) {
  const reducedMotion = usePrefersReducedMotion();
  const [displayValue, setDisplayValue] = useState(value);
  const [flipping, setFlipping] = useState(false);
  const prevFlipKey = useRef(flipKey);

  useEffect(() => {
    if (flipKey === prevFlipKey.current) {
      // flipKeyが変わっていない通常の再レンダーでは、アニメーションなしで
      // 表示だけ最新化する(初回マウント・無関係な親の再レンダー対策)。
      setDisplayValue(value);
      return;
    }
    prevFlipKey.current = flipKey;

    if (reducedMotion) {
      setDisplayValue(value);
      return;
    }

    setFlipping(true);
    // フラップが真横向き(90deg、不可視)になったタイミングで表示内容を
    // 新しい値へ差し替え、そこから0degへ戻すことで「めくれて新しい値が
    // 現れる」ように見せる。
    const timer = setTimeout(() => {
      setDisplayValue(value);
      setFlipping(false);
    }, FLIP_HALF_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flipKey, reducedMotion]);

  return (
    <span className={flipping ? "flap-digit flipped" : "flap-digit"}>
      {displayValue}
    </span>
  );
}
