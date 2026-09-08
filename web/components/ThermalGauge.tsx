"use client";

// WeatherGeoBridge_DESIGN.md Phase7-1(サーマルゲージ)。
// 元の設計メモは寒色(青)〜暖色(赤)へ連続的に色相変化するグラデーションを
// 提案していたが、本アプリの配色ルール(赤はtext-destructive等のエラー専用、
// 通常表示に虹色のグラデーションは使わない)と衝突するため、色相ではなく
// 「目盛り内でのfill位置」で温度感を表す、ink色のみのモノクローム版にしている。

const MIN_TEMP_C = -10;
const MAX_TEMP_C = 40;

export function ThermalGauge({
  temperatureC,
  height = 96,
}: {
  temperatureC: number;
  height?: number;
}) {
  const ratio = Math.min(
    1,
    Math.max(0, (temperatureC - MIN_TEMP_C) / (MAX_TEMP_C - MIN_TEMP_C)),
  );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "var(--space-4)",
      }}
      aria-hidden="true"
    >
      <div
        style={{
          position: "relative",
          width: 14,
          height,
          borderRadius: 7,
          background: "var(--color-surface-alt)",
          border: "1px solid var(--color-hairline)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: `${ratio * 100}%`,
            background:
              "linear-gradient(0deg, var(--color-mid-gray) 0%, var(--color-ink-soft) 100%)",
            transition: "height var(--motion-slow) ease",
          }}
        />
      </div>
    </div>
  );
}
