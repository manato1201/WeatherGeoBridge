// サイトのマーク(「W」の上に差し色の点 = 太陽 / 熾火)。icon.svg と同じ図形を、ImageResponse(apple-icon・PWA・OGP)でも使う。
// 色は globals.css の既定(ダーク)の canvas・ink・ember に合わせる。

export const MARK_COLORS = { tile: "#12130f", ink: "#e4dfda", dot: "#e7000b" } as const;

/**
 * 32x32 の格子で描いたマーク。`rx` はタイルの角丸。
 * `inset` は、全面を塗るアイコン(iOS・maskable)で、マークを内側へ縮める割合(0〜0.3)。
 */
export function MarkSvg({
  size,
  rx = 7,
  inset = 0,
  colors = MARK_COLORS,
}: {
  size: number;
  rx?: number;
  inset?: number;
  colors?: { tile: string; ink: string; dot: string };
}) {
  const s = 1 - inset * 2;
  const t = 16 * (1 - s);
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" rx={rx} fill={colors.tile} />
      <g transform={`translate(${t} ${t}) scale(${s})`}>
        <circle cx="16" cy="7" r="2.8" fill={colors.dot} />
        <path
          d="M6 12l4 11 6-8 6 8 4-11"
          fill="none"
          stroke={colors.ink}
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}
