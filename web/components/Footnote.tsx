"use client";

import { formatFetchedAt } from "@/lib/atlas";
import { useFootnote } from "@/lib/FootnoteContext";

// 全画面の下に固定する注記。「データ元」「取得時刻」「予報であって保証ではない」は
// 誤解されやすい点なので、画面の見える場所に常に出す(P9)。
export function Footnote() {
  const { fetchedAt } = useFootnote();

  return (
    <footer className="footnote" role="contentinfo">
      <span>
        データ元:{" "}
        <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">
          Open-Meteo.com
        </a>{" "}
        (
        <a
          href="https://creativecommons.org/licenses/by/4.0/deed.ja"
          target="_blank"
          rel="noreferrer"
        >
          CC BY 4.0
        </a>
        )
      </span>
      <span className="footnote__sep" aria-hidden="true">
        /
      </span>
      <span>
        地図 ©{" "}
        <a
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noreferrer"
        >
          OpenStreetMap
        </a>{" "}
        contributors
      </span>
      <span className="footnote__sep" aria-hidden="true">
        /
      </span>
      <span>取得 {formatFetchedAt(fetchedAt)}</span>
      <span className="footnote__sep" aria-hidden="true">
        /
      </span>
      <span>
        予報であって保証ではありません。最終判断は
        <a href="https://www.jma.go.jp/" target="_blank" rel="noreferrer">
          気象庁
        </a>
        の予報で
      </span>
    </footer>
  );
}
