"use client";

import dynamic from "next/dynamic";
import { useCountUp } from "@/lib/useCountUp";
import { usePrefersReducedMotion } from "@/lib/usePrefersReducedMotion";

const CloudCoverOrbScene = dynamic(
  () => import("./CloudCoverOrb3D").then((m) => m.CloudCoverOrbScene),
  { ssr: false },
);

export function CloudCoverOrb({
  cloudCoverPercent,
  isDay,
}: {
  cloudCoverPercent: number;
  isDay: boolean;
}) {
  const animatedPercent = useCountUp(cloudCoverPercent, 700);
  const reducedMotion = usePrefersReducedMotion();

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
        雲量オーブ(独自可視化)
      </p>
      <div
        style={{ width: "100%", height: 200, touchAction: "none" }}
        aria-hidden="true"
      >
        <CloudCoverOrbScene
          cloudCoverPercent={cloudCoverPercent}
          isDay={isDay}
          reducedMotion={reducedMotion}
        />
      </div>
      <div>
        <p
          className="stat-block__value"
          style={{ textAlign: "center", margin: 0 }}
        >
          {Math.round(animatedPercent)}%
        </p>
        <p className="stat-block__meta" style={{ textAlign: "center" }}>
          雲量({isDay ? "昼" : "夜"})
        </p>
      </div>
    </div>
  );
}
