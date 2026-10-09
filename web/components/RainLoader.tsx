// 読み込み中の小さな表現(雨粒が落ちる)。アニメーションはglobals.cssで
// prefers-reduced-motion: no-preference のときだけ動く(reduce時は静止した3本線)。
export function RainLoader({ label = "読み込み中" }: { label?: string }) {
  return (
    <span className="text-muted" role="status">
      <span className="rain-loader" aria-hidden="true">
        <span />
        <span />
        <span />
      </span>{" "}
      {label}
    </span>
  );
}
