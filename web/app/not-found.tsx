import Link from "next/link";

// 遊びごころは404に集める(P8)。雲がゆっくり流れるだけで、通常画面は静かなまま。
// 動きはglobals.cssでprefers-reduced-motion: no-preferenceのときだけ有効。
export default function NotFound() {
  return (
    <main className="not-found">
      <div className="not-found__sky" aria-hidden="true">
        <svg
          className="not-found__cloud"
          style={{ left: "6%", top: "28px" }}
          width="170"
          height="80"
          viewBox="0 0 24 24"
        >
          <path d="M7 18h10a4 4 0 0 0 .6-7.95A5.5 5.5 0 0 0 7.1 8.6 4.7 4.7 0 0 0 7 18Z" />
        </svg>
        <svg
          className="not-found__cloud"
          style={{ right: "4%", top: "0" }}
          width="120"
          height="60"
          viewBox="0 0 24 24"
        >
          <path d="M7 18h10a4 4 0 0 0 .6-7.95A5.5 5.5 0 0 0 7.1 8.6 4.7 4.7 0 0 0 7 18Z" />
        </svg>
      </div>
      <p className="eyebrow">404</p>
      <h1
        style={{ margin: 0, fontSize: "var(--text-heading)", lineHeight: 1.3 }}
      >
        このページは雲に隠れてしまいました
      </h1>
      <p className="text-muted" style={{ margin: 0 }}>
        URLが間違っているか、ページが移動した可能性があります。
      </p>
      <div
        style={{
          display: "flex",
          gap: "var(--space-12)",
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        <Link
          href="/"
          className="btn btn--primary"
          style={{ textDecoration: "none" }}
        >
          トップへ →
        </Link>
        <Link
          href="/atlas"
          className="btn btn--outline"
          style={{ textDecoration: "none" }}
        >
          アトラスを開く →
        </Link>
      </div>
    </main>
  );
}
