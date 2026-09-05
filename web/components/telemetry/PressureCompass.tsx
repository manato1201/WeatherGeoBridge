"use client";

import { compassLabel } from "@/lib/weatherCode";

// 「天気図」の代替可視化。気圧配置図の実データ・実画像は使わず、現在の気圧・
// 風向(自前データ)を傾いたアイソメトリックのコンパス/ダイヤルとして
// 独自に可視化する。

const SIZE = 160;

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
  const normalized = Math.min(
    1,
    Math.max(0, (pressureHpa - 970) / (1040 - 970)),
  );
  const ringCount = 3;

  return (
    <div
      className="card"
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
      <div style={{ perspective: 600 }}>
        <div
          style={{
            width: SIZE,
            height: SIZE,
            position: "relative",
            transformStyle: "preserve-3d",
            transform: "rotateX(50deg)",
          }}
        >
          {/* 気圧を示す同心円(hairline) */}
          {Array.from({ length: ringCount }).map((_, i) => {
            const ratio = (i + 1) / ringCount;
            const active = normalized >= ratio - 1 / ringCount / 2;
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  inset: 0,
                  margin: "auto",
                  width: SIZE * ratio,
                  height: SIZE * ratio,
                  borderRadius: "50%",
                  border: `1px solid ${active ? "var(--color-accent-glow)" : "var(--color-hairline)"}`,
                }}
              />
            );
          })}

          {/* 風向針 */}
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              width: 2,
              height: SIZE / 2 - 8,
              background: "var(--color-ink)",
              transformOrigin: "top center",
              transform: `translateX(-50%) translateZ(20px) rotate(${windDirectionDeg}deg)`,
              boxShadow: "0 0 8px var(--color-accent-glow)",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "var(--color-ink)",
              transform: "translate(-50%, -50%) translateZ(22px)",
            }}
          />
        </div>
      </div>
      <div style={{ display: "flex", gap: "var(--space-16)" }}>
        <div>
          <p className="stat-block__label">気圧</p>
          <p className="stat-block__meta">{pressureHpa.toFixed(0)}hPa</p>
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
