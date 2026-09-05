"use client";

import { useEffect, useState } from "react";
import type { HourlyPoint } from "@/lib/types";

// 「雨雲レーダー」の代替可視化。気象庁の実レーダー画像は使わず(非公式エンド
// ポイントのリスクを避けるため)、Open-Meteoの降水確率(自前データ)を
// アイソメトリックな立体ブロック群として独自に可視化する。各ブロックは
// 上面・前面・側面の3面を持つ実際の3D立方体(CSS transform-style:preserve-3d)。
//
// 各立方体の内部形状(3面の配置)は常に最終形の高さで固定して組み立て、
// 出現アニメーションは外側のラッパーでscale(0→1)するだけにする。
// heightを直接アニメーションさせようとすると各面の再配置計算が複雑になり
// 破綻しやすいため、この2層構造(内側=静的な立体、外側=出現演出)に分けている。

const COLS = 6;
const CUBE_SIZE = 26;
const GAP = 3;
const MIN_HEIGHT = 4;
const MAX_HEIGHT = 64;

function formatHour(iso: string): string {
  return `${iso.slice(11, 13)}時`;
}

function faceBase(width: number, height: number): React.CSSProperties {
  return {
    position: "absolute",
    width,
    height,
    top: "50%",
    left: "50%",
  };
}

function IsoCube({
  height,
  revealed,
  delayMs,
  highlight,
}: {
  height: number;
  revealed: boolean;
  delayMs: number;
  highlight: boolean;
}) {
  const halfH = height / 2;
  const halfSize = CUBE_SIZE / 2;

  return (
    <div
      style={{
        width: CUBE_SIZE,
        height: CUBE_SIZE,
        transformStyle: "preserve-3d",
        transformOrigin: "center bottom",
        transform: revealed ? "scale(1)" : "scale(0.01)",
        opacity: revealed ? 1 : 0,
        transition: `transform 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${delayMs}ms, opacity 0.3s ease ${delayMs}ms`,
      }}
    >
      <div style={{ position: "relative", width: "100%", height: "100%", transformStyle: "preserve-3d" }}>
        {/* 上面 */}
        <div
          style={{
            ...faceBase(CUBE_SIZE, CUBE_SIZE),
            background: highlight ? "var(--color-accent-glow)" : "var(--color-ink-soft)",
            border: "1px solid var(--color-canvas)",
            transform: `translate(-50%, -50%) rotateX(90deg) translateZ(${halfH}px)`,
          }}
        />
        {/* 前面 */}
        <div
          style={{
            ...faceBase(CUBE_SIZE, Math.max(height, 1)),
            background: "var(--color-ink)",
            opacity: 0.9,
            transform: `translate(-50%, -50%) translateZ(${halfSize}px) translateY(${halfSize - halfH}px)`,
          }}
        />
        {/* 右面(最も暗い面) */}
        <div
          style={{
            ...faceBase(CUBE_SIZE, Math.max(height, 1)),
            background: "var(--color-mid-gray)",
            opacity: 0.6,
            transform: `translate(-50%, -50%) rotateY(90deg) translateZ(${halfSize}px) translateY(${halfSize - halfH}px)`,
          }}
        />
      </div>
    </div>
  );
}

export function PrecipitationCluster({ hourly }: { hourly: HourlyPoint[] }) {
  const points = hourly.slice(0, 24);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    setRevealed(false);
    const t = setTimeout(() => setRevealed(true), 50);
    return () => clearTimeout(t);
  }, [hourly]);

  if (points.length === 0) return null;

  const maxProb = Math.max(1, ...points.map((p) => p.precipitationProbabilityPercent));

  return (
    <div className="card telemetry-panel">
      <p className="stat-block__label" style={{ margin: "0 0 var(--space-16)" }}>
        降水確率クラスター(次{points.length}時間・独自可視化)
      </p>
      <div
        style={{
          perspective: 900,
          display: "flex",
          justifyContent: "center",
          paddingBottom: MAX_HEIGHT * 0.5 + 16,
          paddingTop: 8,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${COLS}, ${CUBE_SIZE}px)`,
            gap: GAP,
            transformStyle: "preserve-3d",
            transform: "rotateX(55deg) rotateZ(-25deg)",
          }}
        >
          {points.map((p, i) => {
            const height =
              MIN_HEIGHT + (p.precipitationProbabilityPercent / 100) * (MAX_HEIGHT - MIN_HEIGHT);
            return (
              <IsoCube
                key={p.time}
                height={height}
                revealed={revealed}
                delayMs={i * 25}
                highlight={p.precipitationProbabilityPercent === maxProb && maxProb > 30}
              />
            );
          })}
        </div>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${Math.min(COLS, points.length)}, 1fr)`,
          gap: GAP,
          marginTop: "var(--space-8)",
        }}
      >
        {points.slice(0, COLS).map((p, i) => (
          <div key={i} style={{ textAlign: "center" }}>
            <p className="text-caption" style={{ margin: 0 }}>
              {formatHour(p.time)}
            </p>
          </div>
        ))}
      </div>
      <p className="text-caption" style={{ margin: "var(--space-8) 0 0" }}>
        最大 {maxProb}% / ブロックの高さ=降水確率
      </p>
    </div>
  );
}
