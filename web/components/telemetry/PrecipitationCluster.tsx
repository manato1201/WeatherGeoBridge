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
//
// 表示は「次9時間・1行」に固定している。以前は24時間分をCSS gridで複数行に
// 折り返していたが、時刻ラベルは先頭6列分しか表示しておらず、2行目以降の
// 立方体がどの時刻に対応するか読み取れない状態だった(視認性の問題として
// 報告された)。1行に収まる範囲だけを表示し、全列に時刻ラベルを付けることで
// 「どのブロックが何時か」を必ず一意に読み取れるようにしている。

const POINTS_TO_SHOW = 9;
const CUBE_SIZE = 32;
const GAP = 6;
const MIN_HEIGHT = 6;
const MAX_HEIGHT = 76;

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
  intensity,
}: {
  height: number;
  revealed: boolean;
  delayMs: number;
  /** 降水確率を0〜1に正規化した値。面の色・グロー強度に反映する。 */
  intensity: number;
}) {
  const halfH = height / 2;
  const halfSize = CUBE_SIZE / 2;
  // 上面は確率が高いほどアクセントカラーへ寄せ、遠目でも「高さ」だけでなく
  // 「色」でも強度が伝わるようにする(ヒートマップ的な二重の手がかり)。
  const topColor = `color-mix(in srgb, var(--color-ink-soft) ${100 - intensity * 70}%, var(--color-accent-glow) ${intensity * 70}%)`;
  // 前面・側面は常に一定比率のink/canvasミックスにすることで、テーマ(ダーク/
  // ライト)が変わっても背景に対して十分なコントラストを保つ(旧実装は
  // var(--color-mid-gray)を暗く使っており、黒背景に溶けて見えていた)。
  const frontColor =
    "color-mix(in srgb, var(--color-ink) 72%, var(--color-canvas) 28%)";
  const rightColor =
    "color-mix(in srgb, var(--color-ink) 46%, var(--color-canvas) 54%)";

  return (
    <div
      style={{
        width: CUBE_SIZE,
        height: CUBE_SIZE,
        transformStyle: "preserve-3d",
        transformOrigin: "center bottom",
        transform: revealed ? "scale(1)" : "scale(0.01)",
        opacity: revealed ? 1 : 0,
        transition: `transform var(--motion-medium) cubic-bezier(0.16, 1, 0.3, 1) ${delayMs}ms, opacity var(--motion-fast) ease ${delayMs}ms`,
      }}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          transformStyle: "preserve-3d",
        }}
      >
        {/* 上面 */}
        <div
          style={{
            ...faceBase(CUBE_SIZE, CUBE_SIZE),
            background: topColor,
            border: "1px solid rgba(0,0,0,0.3)",
            borderRadius: 3,
            boxShadow:
              intensity > 0.35 ? "0 0 10px var(--color-accent-glow)" : "none",
            transform: `translate(-50%, -50%) rotateX(90deg) translateZ(${halfH}px)`,
          }}
        />
        {/* 前面 */}
        <div
          style={{
            ...faceBase(CUBE_SIZE, Math.max(height, 1)),
            background: frontColor,
            borderRadius: "0 0 3px 3px",
            transform: `translate(-50%, -50%) translateZ(${halfSize}px) translateY(${halfSize - halfH}px)`,
          }}
        />
        {/* 右面(最も暗い面) */}
        <div
          style={{
            ...faceBase(CUBE_SIZE, Math.max(height, 1)),
            background: rightColor,
            borderRadius: "0 0 3px 3px",
            transform: `translate(-50%, -50%) rotateY(90deg) translateZ(${halfSize}px) translateY(${halfSize - halfH}px)`,
          }}
        />
      </div>
    </div>
  );
}

export function PrecipitationCluster({ hourly }: { hourly: HourlyPoint[] }) {
  const points = hourly.slice(0, POINTS_TO_SHOW);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    setRevealed(false);
    const t = setTimeout(() => setRevealed(true), 50);
    return () => clearTimeout(t);
  }, [hourly]);

  if (points.length === 0) return null;

  const maxProb = Math.max(
    1,
    ...points.map((p) => p.precipitationProbabilityPercent),
  );

  return (
    <div className="card telemetry-panel">
      <p
        className="stat-block__label"
        style={{ margin: "0 0 var(--space-16)" }}
      >
        降水確率クラスター(次{points.length}時間・独自可視化)
      </p>
      {/* 視覚的な装飾。同じ情報は下の時刻・%テキストで読み上げ可能なため、
          支援技術からは隠す。 */}
      <div
        aria-hidden="true"
        style={{
          perspective: 900,
          display: "flex",
          justifyContent: "center",
          paddingBottom: MAX_HEIGHT * 0.5 + 16,
          paddingTop: 8,
          position: "relative",
        }}
      >
        {/* 接地シャドウ: 立体群が宙に浮いているように見えるのを防ぎ、
            台座に乗っているような重さ・奥行きを与える。 */}
        <div
          style={{
            position: "absolute",
            bottom: 4,
            left: "50%",
            width: CUBE_SIZE * points.length * 0.85,
            height: 20,
            transform: "translateX(-50%)",
            background:
              "radial-gradient(ellipse at center, rgba(0,0,0,0.45) 0%, transparent 75%)",
            filter: "blur(2px)",
          }}
        />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${points.length}, ${CUBE_SIZE}px)`,
            gap: GAP,
            transformStyle: "preserve-3d",
            transform: "rotateX(55deg) rotateZ(-25deg)",
          }}
        >
          {points.map((p, i) => {
            const ratio = p.precipitationProbabilityPercent / 100;
            const height = MIN_HEIGHT + ratio * (MAX_HEIGHT - MIN_HEIGHT);
            return (
              <IsoCube
                key={p.time}
                height={height}
                revealed={revealed}
                delayMs={i * 60}
                intensity={ratio}
              />
            );
          })}
        </div>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${points.length}, 1fr)`,
          gap: GAP,
          marginTop: "var(--space-8)",
        }}
      >
        {points.map((p, i) => (
          <div key={i} style={{ textAlign: "center" }}>
            <p className="text-caption" style={{ margin: 0 }}>
              {formatHour(p.time)}
            </p>
            <p className="text-caption" style={{ margin: 0, opacity: 0.7 }}>
              {p.precipitationProbabilityPercent}%
            </p>
          </div>
        ))}
      </div>
      <p className="text-caption" style={{ margin: "var(--space-8) 0 0" }}>
        最大 {maxProb}% / ブロックの高さ・色の濃さ=降水確率
      </p>
    </div>
  );
}
