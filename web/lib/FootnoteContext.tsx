"use client";

// 画面下に固定する注記(IMPROVEMENT_DESIGN_2026-10.md 4.3)の「取得時刻」を、
// 各ページが実際にデータを取得した時刻で更新する。未取得の間は「—」を出す。

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

interface FootnoteState {
  fetchedAt: string | null;
  setFetchedAt: (iso: string | null) => void;
}

const FootnoteContext = createContext<FootnoteState | null>(null);

export function FootnoteProvider({ children }: { children: ReactNode }) {
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  return (
    <FootnoteContext.Provider value={{ fetchedAt, setFetchedAt }}>
      {children}
    </FootnoteContext.Provider>
  );
}

export function useFootnote(): FootnoteState {
  const ctx = useContext(FootnoteContext);
  if (!ctx) throw new Error("useFootnote must be used within a FootnoteProvider");
  return ctx;
}

/** ページがデータを取得したら、その取得時刻(ISO)を注記へ反映する。 */
export function useReportFetchedAt(iso: string | null): void {
  const { setFetchedAt } = useFootnote();
  useEffect(() => {
    if (iso) setFetchedAt(iso);
  }, [iso, setFetchedAt]);
}
