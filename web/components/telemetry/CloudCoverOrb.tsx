"use client";

import { useCountUp } from "@/lib/useCountUp";

// 「気象衛星」の代替可視化。ひまわり衛星の実画像は使わず、現在の雲量%
// (自前データ)をCSSの陰影(radial-gradient)+回転で疑似的な球体として
// 独自に可視化する。常時ゆっくり自転させ、静止画にならないようにしている。

const SIZE = 140;

export function CloudCoverOrb({ cloudCoverPercent, isDay }: { cloudCoverPercent: number; isDay: boolean }) {
  const cloudOpacity = cloudCoverPercent / 100;
  const animatedPercent = useCountUp(cloudCoverPercent, 700);

  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-16)" }}>
      <p className="stat-block__label" style={{ margin: 0, alignSelf: "flex-start" }}>
        雲量オーブ(独自可視化)
      </p>
      <div style={{ perspective: 500 }}>
        <div
          className="cloud-orb"
          style={{
            width: SIZE,
            height: SIZE,
            borderRadius: "50%",
            position: "relative",
            transformStyle: "preserve-3d",
            background: isDay
              ? "radial-gradient(circle at 32% 28%, var(--color-ink-soft) 0%, var(--color-surface-alt) 55%, var(--color-canvas) 100%)"
              : "radial-gradient(circle at 32% 28%, var(--color-mid-gray) 0%, var(--color-surface-alt) 55%, var(--color-canvas) 100%)",
            boxShadow: "0 0 24px var(--color-accent-glow)",
          }}
        >
          {/* 雲層: 雲量%に応じた不透明度のもや状オーバーレイ */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              background:
                "radial-gradient(circle at 45% 40%, rgba(228,223,218,0.9) 0%, rgba(228,223,218,0.2) 45%, transparent 70%)",
              opacity: cloudOpacity,
              transition: "opacity 0.8s ease",
            }}
          />
        </div>
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
