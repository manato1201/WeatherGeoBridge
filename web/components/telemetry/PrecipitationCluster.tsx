"use client";

import { useEffect, useState } from "react";
import type { HourlyPoint } from "@/lib/types";

// 「雨雲レーダー」の代替可視化。気象庁の実レーダー画像は使わず(非公式エンド
// ポイントのリスクを避けるため)、Open-Meteoの降水確率(自前データ)を
// 3Dの縦棒(実際の3D立方体、上面・前面・側面を持つ)として可視化する。
//
// 過去2回、レイアウト全体(CSS gridのコンテナ)を rotateX+rotateZ で回転
// させていたが、これは「行内の位置(=時刻)」と「回転による見かけ上の
// 縦方向のズレ」が線形に結びついてしまい、実際の降水確率とは無関係な
// 階段状の錯視を生んでいた(ユーザー報告のスクリーンショットで確認済み)。
//
// 対策: コンテナ自体は一切回転させず、各立方体を個別に(同じ角度で)
// 回転させる。各立方体のラッパーは高さに関わらず常に同じCUBE_SIZE四方の
// 箱として扱っているため、「どこに並ぶか」は普通の2Dグリッドのままで
// 揃い、棒の底辺は常に一直線に揃う(=通常の棒グラフと同じ読み方ができる)。
// 立方体そのものの内部(上面・前面・側面)は正しい3Dの箱として組み立てて
// あるので、見た目の奥行きと数値としての正しさを両立できる。

const POINTS_TO_SHOW = 9;
const CUBE_SIZE = 34;
const GAP = 10;
const MIN_HEIGHT = 8;
const MAX_HEIGHT = 92;
const TILT = "rotateX(56deg) rotateY(-22deg)";
const GUIDE_RATIOS = [0.25, 0.5, 0.75, 1];

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
  // ライト)が変わっても背景に対して十分なコントラストを保つ。
  const frontColor =
    "color-mix(in srgb, var(--color-ink) 78%, var(--color-canvas) 22%)";
  const rightColor =
    "color-mix(in srgb, var(--color-ink) 48%, var(--color-canvas) 52%)";

  const revealTransform = revealed ? "scaleY(1)" : "scaleY(0.04)";

  return (
    <div
      style={{
        width: CUBE_SIZE,
        height: CUBE_SIZE,
        transformStyle: "preserve-3d",
        transformOrigin: "center bottom",
        // 回転(TILT)は全キューブ共通・固定。データに応じて変わるのは
        // scaleYの出現アニメーションだけなので、行の並びが崩れない。
        transform: `${TILT} ${revealTransform}`,
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
  const rowWidth = points.length * CUBE_SIZE + (points.length - 1) * GAP;

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
          paddingBottom: 20,
          paddingTop: 12,
          position: "relative",
        }}
      >
        {/* 基準線(0%・25%・50%・75%・100%)。行全体を回転させていた頃と
            違い、コンテナ自体は回転していないため、通常の棒グラフと同じ
            感覚で「高さ=どのくらいの確率か」を目盛りから即座に読み取れる。 */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 20,
            height: MAX_HEIGHT,
            width: rowWidth,
            margin: "0 auto",
          }}
        >
          {GUIDE_RATIOS.map((ratio) => (
            <div
              key={ratio}
              style={{
                position: "absolute",
                left: -36,
                right: 0,
                bottom: MIN_HEIGHT + ratio * (MAX_HEIGHT - MIN_HEIGHT),
                borderTop: "1px dashed rgba(228,223,218,0.18)",
              }}
            >
              <span
                className="text-caption"
                style={{
                  position: "absolute",
                  left: 0,
                  transform: "translateY(-50%)",
                  opacity: 0.6,
                }}
              >
                {Math.round(ratio * 100)}%
              </span>
            </div>
          ))}
        </div>

        {/* 接地シャドウ: 立体群が宙に浮いているように見えるのを防ぎ、
            台座に乗っているような重さ・奥行きを与える。 */}
        <div
          style={{
            position: "absolute",
            bottom: 16,
            left: "50%",
            width: rowWidth * 0.95,
            height: 16,
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
            alignItems: "end",
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
