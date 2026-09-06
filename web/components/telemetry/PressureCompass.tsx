"use client";

import { useCountUp } from "@/lib/useCountUp";
import { compassLabel } from "@/lib/weatherCode";

// 「天気図」の代替可視化。気圧配置図の実データ・実画像は使わず、現在の気圧・
// 風向(自前データ)を傾いたアイソメトリックのコンパス/ダイヤルとして
// 独自に可視化する。常時回転するレーダー掃引でアニメーションを加えている。

const SIZE = 168;
const CARDINALS: Array<{ label: string; deg: number }> = [
  { label: "N", deg: 0 },
  { label: "E", deg: 90 },
  { label: "S", deg: 180 },
  { label: "W", deg: 270 },
];

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
      {/* 視覚的な装飾。同じ情報は下のテキスト(気圧・風向)で読み上げ可能なため、
          支援技術からは隠す。 */}
      <div style={{ perspective: 600 }} aria-hidden="true">
        <div
          style={{
            width: SIZE,
            height: SIZE,
            position: "relative",
            transformStyle: "preserve-3d",
            transform: "rotateX(50deg)",
          }}
        >
          {/* レーダー掃引(常時回転、静止画にしないための演出) */}
          <div
            className="radar-sweep"
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              background:
                "conic-gradient(from 0deg, var(--color-accent-glow) 0deg, transparent 40deg)",
              opacity: 0.35,
            }}
          />

          {/* 気圧を示す同心円。以前はvar(--color-hairline)の1px線で、黒背景と
              ほぼ同化して視認できなかったため、非アクティブ時も
              半透明のink色+2px幅にして常に輪郭が見える最低限のコントラストを
              確保している。 */}
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
                  border: `2px solid ${active ? "var(--color-accent-glow)" : "rgba(228,223,218,0.28)"}`,
                  boxShadow: active
                    ? "0 0 12px var(--color-accent-glow)"
                    : "none",
                  transition:
                    "border-color var(--motion-medium) ease, box-shadow var(--motion-medium) ease",
                }}
              />
            );
          })}

          {/* 方位ラベル(N/E/S/W)。傾いたダイヤルの上に貼り付け、リングだけでは
              伝わりにくい「どちらが北か」を明示する。 */}
          {CARDINALS.map(({ label, deg }) => {
            const rad = (deg * Math.PI) / 180;
            const radius = SIZE / 2 + 14;
            const x = SIZE / 2 + radius * Math.sin(rad);
            const y = SIZE / 2 - radius * Math.cos(rad);
            return (
              <span
                key={label}
                className="text-caption"
                style={{
                  position: "absolute",
                  left: x,
                  top: y,
                  transform: "translate(-50%, -50%) translateZ(6px)",
                  color:
                    label === "N"
                      ? "var(--color-ink-soft)"
                      : "var(--color-mid-gray)",
                  fontWeight: label === "N" ? 700 : 400,
                }}
              >
                {label}
              </span>
            );
          })}

          {/* 風向針 */}
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              width: 3,
              height: SIZE / 2 - 8,
              background: "var(--color-ink-soft)",
              borderRadius: 2,
              transformOrigin: "top center",
              transform: `translateX(-50%) translateZ(20px) rotate(${windDirectionDeg}deg)`,
              transition:
                "transform var(--motion-slow) cubic-bezier(0.34, 1.56, 0.64, 1)",
              boxShadow: "0 0 10px var(--color-accent-glow)",
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
