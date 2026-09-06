"use client";

import { useCountUp } from "@/lib/useCountUp";

// 「気象衛星」の代替可視化。ひまわり衛星の実画像は使わず、現在の雲量%
// (自前データ)をCSSの陰影(radial-gradient)+回転で疑似的な球体として
// 独自に可視化する。
//
// 注意: 球体を模した「平面の円」をrotateX/rotateYで3D回転させると、
// 真横向き(90度/270度)の瞬間に厚みゼロの線として潰れて見える
// (実際にこのバグが視認性の問題として報告された)。そのため球体自体は
// 常に正面を向けたまま固定し、内部の雲テクスチャ層だけをrotateZ(面内回転)
// で常時渦巻かせることで、「潰れずに」動きのある見た目にしている。

const SIZE = 148;

export function CloudCoverOrb({ cloudCoverPercent, isDay }: { cloudCoverPercent: number; isDay: boolean }) {
  const cloudOpacity = 0.35 + (cloudCoverPercent / 100) * 0.65;
  const animatedPercent = useCountUp(cloudCoverPercent, 700);

  return (
    <div className="card telemetry-panel" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-16)" }}>
      <p className="stat-block__label" style={{ margin: 0, alignSelf: "flex-start" }}>
        雲量オーブ(独自可視化)
      </p>
      {/* 視覚的な装飾。同じ情報は下のテキスト(%・昼夜)で読み上げ可能なため、
          支援技術からは隠す。 */}
      <div
        aria-hidden="true"
        style={{
          width: SIZE,
          height: SIZE,
          borderRadius: "50%",
          position: "relative",
          overflow: "hidden",
          border: "1px solid var(--color-accent-glow)",
          background: isDay
            ? "radial-gradient(circle at 32% 28%, var(--color-ink-soft) 0%, var(--color-surface-alt) 60%, var(--color-canvas) 100%)"
            : "radial-gradient(circle at 32% 28%, var(--color-mid-gray) 0%, var(--color-surface-alt) 60%, var(--color-canvas) 100%)",
          boxShadow: "0 0 32px var(--color-accent-glow), inset 0 0 24px rgba(0,0,0,0.5)",
        }}
      >
        {/* 雲層: 雲量%に応じた不透明度の渦状オーバーレイ。円形の枠内でrotateZのみ
            使うため、球体の輪郭は常にフルの円のまま保たれる。 */}
        <div
          className="cloud-orb"
          style={{
            position: "absolute",
            inset: "-25%",
            borderRadius: "50%",
            background:
              "conic-gradient(from 0deg, rgba(228,223,218,0.85) 0deg, rgba(228,223,218,0.15) 90deg, rgba(228,223,218,0.75) 180deg, rgba(228,223,218,0.1) 270deg, rgba(228,223,218,0.85) 360deg)",
            opacity: cloudOpacity,
            transition: "opacity var(--motion-slow) ease",
          }}
        />
        {/* 中心のハイライト(球面の光沢を表現、回転しない固定層) */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            background:
              "radial-gradient(circle at 30% 25%, rgba(255,255,255,0.35) 0%, transparent 40%)",
          }}
        />
      </div>
      <div>
        <p className="stat-block__value" style={{ textAlign: "center", margin: 0 }}>
          {Math.round(animatedPercent)}%
        </p>
        <p className="stat-block__meta" style={{ textAlign: "center" }}>
          雲量({isDay ? "昼" : "夜"})
        </p>
      </div>
    </div>
  );
}
