"use client";

import dynamic from "next/dynamic";
import { useCountUp } from "@/lib/useCountUp";
import { compassLabel } from "@/lib/weatherCode";

// 「天気図」の代替可視化。気圧配置図の実データ・実画像は使わず、現在の気圧・
// 風向(自前データ)を実際のWebGL(three.js)で描いたコンパス/ダイヤルとして
// 独自に可視化する。カメラは固定(回転しない)なので、N/E/S/Wのラベルは
// 3Dテキストではなく通常のDOMテキストとしてキャンバスの上に重ねている。

const PressureCompassScene = dynamic(
  () => import("./PressureCompass3D").then((m) => m.PressureCompassScene),
  { ssr: false },
);

export function PressureCompass({
  pressureHpa,
  windDirectionDeg,
  windSpeedLabel,
}: {
  pressureHpa: number;
  windDirectionDeg: number;
  windSpeedLabel: string;
}) {
  // 気圧の一般的なレンジ(970〜1040hPa程度)を0-1に正規化し、リングの本数に反映。
  const normalized = Math.min(1, Math.max(0, (pressureHpa - 970) / (1040 - 970)));
  const animatedPressure = useCountUp(pressureHpa, 700);

  return (
    <div
      className="card telemetry-panel"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "var(--space-16)",
      }}
    >
      <p
        className="stat-block__label"
        style={{ margin: 0, alignSelf: "flex-start" }}
      >
        気圧・風配図(独自可視化)
      </p>
      <div style={{ position: "relative", width: "100%", height: 220 }}>
        <div
          style={{ position: "absolute", inset: 0, touchAction: "none" }}
          aria-hidden="true"
        >
          <PressureCompassScene
            normalized={normalized}
            windDirectionDeg={windDirectionDeg}
          />
        </div>
        {/* 方位ラベル(N/E/S/W)。カメラが固定のダイヤルなので、DOMテキストを
            重ねるだけで常に正しい位置に表示できる。 */}
        <span
          className="text-caption"
          style={{ position: "absolute", top: 4, left: "50%", transform: "translateX(-50%)", fontWeight: 700, color: "var(--color-ink-soft)" }}
        >
          N
        </span>
        <span
          className="text-caption"
          style={{ position: "absolute", bottom: 4, left: "50%", transform: "translateX(-50%)" }}
        >
          S
        </span>
        <span
          className="text-caption"
          style={{ position: "absolute", right: 4, top: "50%", transform: "translateY(-50%)" }}
        >
          E
        </span>
        <span
          className="text-caption"
          style={{ position: "absolute", left: 4, top: "50%", transform: "translateY(-50%)" }}
        >
          W
        </span>
      </div>
      <div style={{ display: "flex", gap: "var(--space-16)" }}>
        <div>
          <p className="stat-block__label">気圧</p>
          <p className="stat-block__meta">{animatedPressure.toFixed(0)}hPa</p>
        </div>
        <div>
          <p className="stat-block__label">風向</p>
          <p className="stat-block__meta">
            {compassLabel(windDirectionDeg)} / {windSpeedLabel}
          </p>
        </div>
      </div>
    </div>
  );
}
