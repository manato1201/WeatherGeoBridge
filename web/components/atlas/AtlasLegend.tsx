import {
  heightNote,
  legendGradient,
  legendTickPosition,
  METRICS,
  type AtlasMetric,
} from "@/lib/atlas";

// 凡例。色だけで値を読ませないよう、目盛りの数値と立体の高さの読み方も出す。
export function AtlasLegend({
  metric,
  view,
}: {
  metric: AtlasMetric;
  view: "flat" | "3d";
}) {
  const def = METRICS[metric];
  return (
    <div className="atlas-legend" aria-label={`${def.label}の凡例`}>
      <p className="atlas-legend__title">
        {def.label}
        <small>({def.unit})</small>
      </p>
      <div
        className="atlas-legend__bar"
        style={{ background: legendGradient(metric) }}
      />
      <div className="atlas-legend__ticks">
        {def.ticks.map((t) => (
          <span
            key={t}
            className="num"
            style={{ left: `${legendTickPosition(metric, t)}%` }}
          >
            {t}
          </span>
        ))}
      </div>
      {view === "3d" && (
        <p className="atlas-legend__note">{heightNote(metric)}</p>
      )}
    </div>
  );
}
