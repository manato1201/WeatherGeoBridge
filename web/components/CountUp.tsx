"use client";

import { useEffect, useState } from "react";
import { useCountUp } from "@/lib/useCountUp";

// 数値のカウントアップ(Motion 08)。マウント直後は0から、以降は値が変わるたびに
// 直前の値から新しい値へ動く。prefers-reduced-motion では useCountUp 側で即時に切り替わる。
export function CountUp({
  value,
  fractionDigits = 0,
  durationMs = 700,
}: {
  value: number;
  fractionDigits?: number;
  durationMs?: number;
}) {
  const [target, setTarget] = useState(0);
  useEffect(() => setTarget(value), [value]);
  const shown = useCountUp(target, durationMs);
  return <>{shown.toFixed(fractionDigits)}</>;
}
