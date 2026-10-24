// 白黒の線画の雲(Y2 #136 Line boil)。線が手描きのアニメのように小さく震える。
// SVGフィルタ(feTurbulence + feDisplacementMap)を種違いで3つ用意し、CSSの steps で
// 約8コマ/秒で切り替えるだけ(スクリプトなし)。飾りなので支援技術からは隠す。
// 動きを減らす設定ではフィルタを外し、静止した線画になる(globals.css)。
const CLOUD =
  "M7 18h10a4 4 0 0 0 .6-7.95A5.5 5.5 0 0 0 7.1 8.6 4.7 4.7 0 0 0 7 18Z";

const SEEDS = [
  ["wgb-boil-a", 3],
  ["wgb-boil-b", 17],
  ["wgb-boil-c", 41],
] as const;

export function CloudBoil({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 160 80"
      aria-hidden="true"
      focusable="false"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        {SEEDS.map(([id, seed]) => (
          <filter key={id} id={id} x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.035"
              numOctaves="2"
              seed={seed}
            />
            <feDisplacementMap in="SourceGraphic" scale="3.2" />
          </filter>
        ))}
      </defs>
      <g className="cloud-boil__lines">
        <g transform="translate(6 14) scale(4.6)">
          <path d={CLOUD} vectorEffect="non-scaling-stroke" />
        </g>
        <g transform="translate(92 2) scale(3.1)">
          <path d={CLOUD} vectorEffect="non-scaling-stroke" />
        </g>
        <g transform="translate(70 44) scale(1.9)">
          <path d={CLOUD} vectorEffect="non-scaling-stroke" />
        </g>
      </g>
    </svg>
  );
}
