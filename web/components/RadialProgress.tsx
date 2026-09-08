"use client";

// WeatherGeoBridge_DESIGN.md Phase7-2(ラジアルプログレス)。
// 元の設計メモは進捗色に決め打ちのアクセントカラーを使っていたが、本アプリの
// 配色ルール(--color-accent-glowはテレメトリー要素の縁光専用、通常のUI
// クロムには使わない)に合わせて、進捗はink色で表現するモノクローム版にしている。

export function RadialProgress({
  percent,
  label,
  valueLabel,
  size = 64,
}: {
  /** 0-100 */
  percent: number;
  label: string;
  valueLabel: string;
  size?: number;
}) {
  const strokeWidth = size * 0.09;
  const r = size / 2 - strokeWidth;
  const c = 2 * Math.PI * r;
  const clamped = Math.min(100, Math.max(0, percent));

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "var(--space-4)",
      }}
    >
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={strokeWidth}
          fill="none"
          stroke="var(--color-hairline)"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={strokeWidth}
          fill="none"
          stroke="var(--color-ink)"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - clamped / 100)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dashoffset var(--motion-slow) ease" }}
        />
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={size * 0.24}
          fontFamily="var(--font-mono)"
          fill="var(--color-ink)"
        >
          {valueLabel}
        </text>
      </svg>
      <p className="text-caption" style={{ margin: 0 }}>
        {label}
      </p>
    </div>
  );
}
