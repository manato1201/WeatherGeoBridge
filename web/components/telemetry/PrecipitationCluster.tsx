"use client";

import type { HourlyPoint } from "@/lib/types";

// 「雨雲レーダー」の代替可視化。気象庁の実レーダー画像は使わず(非公式エンド
// ポイントのリスクを避けるため)、Open-Meteoの降水確率(自前データ)を
// アイソメトリックに浮かぶブロック群として独自に可視化する。実画像ではない
// ことをpage.tsx側のキャプションで明示する。

const CELL_SIZE = 28;
const GAP = 6;
const MAX_LIFT = 60;

function formatHour(iso: string): string {
  return `${iso.slice(11, 13)}時`;
}

export function PrecipitationCluster({ hourly }: { hourly: HourlyPoint[] }) {
  const points = hourly.slice(0, 9);
  if (points.length === 0) return null;

  return (
    <div className="card">
      <p
        className="stat-block__label"
        style={{ margin: "0 0 var(--space-16)" }}
      >
        降水確率クラスター(次{points.length}時間・独自可視化)
      </p>
      <div
        style={{
          perspective: 700,
          display: "flex",
          justifyContent: "center",
          paddingBottom: MAX_LIFT + 24,
        }}
      >
        <div
          style={{
            display: "flex",
            gap: GAP,
            transformStyle: "preserve-3d",
            transform: "rotateX(55deg) rotateZ(-25deg)",
          }}
        >
          {points.map((p, i) => {
            const lift = (p.precipitationProbabilityPercent / 100) * MAX_LIFT;
            return (
              <div
                key={i}
                style={{
                  width: CELL_SIZE,
                  height: CELL_SIZE,
                  position: "relative",
                  transformStyle: "preserve-3d",
                }}
              >
                {/* 床面(基準タイル) */}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "var(--color-surface-alt)",
                    border: "1px solid var(--color-hairline)",
                  }}
                />
                {/* 降水確率に応じて浮き上がるブロック本体 */}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "var(--color-ink)",
                    opacity:
                      0.25 + (p.precipitationProbabilityPercent / 100) * 0.75,
                    border: "1px solid var(--color-accent-glow)",
                    boxShadow:
                      lift > 2 ? "0 0 12px var(--color-accent-glow)" : "none",
                    transform: `translateZ(${lift}px)`,
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: GAP,
          marginTop: "var(--space-8)",
        }}
      >
        {points.map((p, i) => (
          <div key={i} style={{ width: CELL_SIZE, textAlign: "center" }}>
            <p className="text-caption" style={{ margin: 0 }}>
              {formatHour(p.time)}
            </p>
            <p className="text-caption" style={{ margin: 0 }}>
              {p.precipitationProbabilityPercent}%
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
