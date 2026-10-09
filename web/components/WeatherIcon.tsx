import { categorize, type WeatherCategory } from "@/lib/weatherCode";

// 天気アイコンは線画SVG1セットだけ(絵文字は使わない。IMPROVEMENT_DESIGN_2026-10.md 3章)。
// 線の太さ・端の丸め・24pxのグリッドをすべて揃えている。

const CLOUD = "M7 18h10a4 4 0 0 0 .6-7.95A5.5 5.5 0 0 0 7.1 8.6 4.7 4.7 0 0 0 7 18Z";

function Glyph({ category }: { category: WeatherCategory }) {
  switch (category) {
    case "Clear":
      return (
        <>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4" />
        </>
      );
    case "Rain":
      return (
        <>
          <path d="M7 15h10a4 4 0 0 0 .6-7.95A5.5 5.5 0 0 0 7.1 5.6 4.7 4.7 0 0 0 7 15Z" />
          <path d="M9 18l-1 3M13 18l-1 3M17 18l-1 3" />
        </>
      );
    case "Snow":
      return (
        <>
          <path d="M7 15h10a4 4 0 0 0 .6-7.95A5.5 5.5 0 0 0 7.1 5.6 4.7 4.7 0 0 0 7 15Z" />
          <path d="M9 18.5v.01M13 20v.01M17 18.5v.01M11 22v.01" strokeWidth="2.4" />
        </>
      );
    case "Storm":
      return (
        <>
          <path d="M7 15h10a4 4 0 0 0 .6-7.95A5.5 5.5 0 0 0 7.1 5.6 4.7 4.7 0 0 0 7 15Z" />
          <path d="M12.5 15l-2.5 4h3l-2 3.5" />
        </>
      );
    case "Cloudy":
    case "Unknown":
    default:
      return <path d={CLOUD} />;
  }
}

export function WeatherIcon({
  weatherCode,
  size = 24,
  title,
}: {
  weatherCode: number;
  size?: number;
  /** 指定すると読み上げ可能なラベルになる。省略時は装飾として隠す。 */
  title?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <Glyph category={categorize(weatherCode)} />
    </svg>
  );
}
