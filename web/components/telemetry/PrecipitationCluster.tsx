"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import type { HourlyPoint } from "@/lib/types";
import { usePrefersReducedMotion } from "@/lib/usePrefersReducedMotion";

// three.js/WebGLはサーバー側でレンダリングできないため、クライアント専用の
// dynamic importにする(next/dynamicのssr:false)。
const PrecipitationClusterScene = dynamic(
  () =>
    import("./PrecipitationCluster3D").then(
      (m) => m.PrecipitationClusterScene,
    ),
  { ssr: false },
);

const POINTS_TO_SHOW = 9;

function formatHour(iso: string): string {
  return `${iso.slice(11, 13)}時`;
}

export function PrecipitationCluster({ hourly }: { hourly: HourlyPoint[] }) {
  const points = hourly.slice(0, POINTS_TO_SHOW);
  const reducedMotion = usePrefersReducedMotion();
  const ratios = useMemo(
    () => points.map((p) => p.precipitationProbabilityPercent / 100),
    [points],
  );

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
      {/* 同じ情報は下の時刻・%テキストで読み上げ可能なため、支援技術からは隠す。
          ドラッグで視点を回転できる(自動でもゆっくり回転する)。 */}
      <div style={{ height: 260, touchAction: "none" }} aria-hidden="true">
        <PrecipitationClusterScene ratios={ratios} reducedMotion={reducedMotion} />
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${points.length}, 1fr)`,
          gap: 6,
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
        最大 {maxProb}% / ブロックの高さ・色の濃さ=降水確率(ドラッグで視点回転)
      </p>
    </div>
  );
}
