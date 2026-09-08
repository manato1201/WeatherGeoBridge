"use client";

import { useCountUp } from "@/lib/useCountUp";

// 「気象衛星」の代替可視化。ひまわり衛星の実画像は使わず、現在の雲量%
// (自前データ)をCSSの陰影のみで疑似的な球体として独自に可視化する。
//
// これまで2回、「球体らしさ」が伝わらない問題が報告された。原因は雲量が
// 100%に近いと、雲テクスチャ層の不透明度がほぼ1.0になり、下に敷いていた
// 球面シェーディング(陰影)を完全に覆い隠してしまい、平らな金属コインの
// ように見えていたこと。対策として、
//   1. 雲テクスチャ層の不透明度に上限を設け、常に下の陰影が透けるようにする
//   2. 「陰(明暗の境界線)」と「ハイライト」を雲テクスチャより上のレイヤーに
//      mix-blend-modeで重ね、雲がどれだけ濃くても球体の丸みが必ず見える
//      ようにする
// という2層構造にしている。

const SIZE = 148;

export function CloudCoverOrb({
  cloudCoverPercent,
  isDay,
}: {
  cloudCoverPercent: number;
  isDay: boolean;
}) {
  // 0.7を上限にし、雲量100%でも下の球面シェーディングが完全には隠れない
  // ようにする(これが無いと「平らなコイン」に見えてしまう)。
  const cloudOpacity = 0.15 + (cloudCoverPercent / 100) * 0.55;
  const animatedPercent = useCountUp(cloudCoverPercent, 700);

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
          boxShadow: "0 0 32px var(--color-accent-glow)",
          // 球面シェーディング(陰影)の土台。ハイライト位置から反対側の縁へ
          // 向かって、白に近い明るさから黒に近い暗さまで大きくコントラストを
          // つけることで、遠目にも「球体」だと即座に読み取れるようにする。
          background: isDay
            ? "radial-gradient(circle at 32% 28%, #ffffff 0%, var(--color-ink-soft) 22%, var(--color-mid-gray) 55%, #05050a 100%)"
            : "radial-gradient(circle at 32% 28%, var(--color-ink-soft) 0%, var(--color-mid-gray) 30%, #1a1a22 65%, #020204 100%)",
        }}
      >
        {/* 雲層: 雲量%に応じた不透明度の渦状オーバーレイ。円形の枠内で面内
            回転(rotateZ)のみ使うため、球体の輪郭は常にフルの円のまま保たれる。
            不透明度に上限(0.7)を設けており、雲量100%でも下の球面シェーディング
            が完全には隠れないようにしている。 */}
        <div
          className="cloud-orb"
          style={{
            position: "absolute",
            inset: "-25%",
            borderRadius: "50%",
            background:
              "conic-gradient(from 0deg, rgba(245,242,238,0.9) 0deg, rgba(245,242,238,0.1) 90deg, rgba(245,242,238,0.8) 180deg, rgba(245,242,238,0.05) 270deg, rgba(245,242,238,0.9) 360deg)",
            opacity: cloudOpacity,
            transition: "opacity var(--motion-slow) ease",
            mixBlendMode: "screen",
          }}
        />
        {/* 明暗の境界線(ターミネーター)。乗算(multiply)で常に最前面に
            重ねることで、雲テクスチャがどれだけ濃くても球体の丸みが
            必ず視認できるようにする。 */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            background:
              "radial-gradient(circle at 68% 74%, transparent 30%, rgba(0,0,0,0.55) 75%, rgba(0,0,0,0.85) 100%)",
            mixBlendMode: "multiply",
          }}
        />
        {/* スペキュラーハイライト。screenで常に最前面に重ね、光沢を強調する。 */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            background:
              "radial-gradient(circle at 28% 24%, rgba(255,255,255,0.8) 0%, transparent 30%)",
            mixBlendMode: "screen",
          }}
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
