"use client";

import { useTheme, type ThemePreference } from "@/lib/ThemeContext";

const LABELS: Record<ThemePreference, string> = {
  system: "自動",
  light: "ライト",
  dark: "ダーク",
};

const NEXT: Record<ThemePreference, ThemePreference> = {
  system: "light",
  light: "dark",
  dark: "system",
};

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <button
      className="btn btn--outline"
      type="button"
      onClick={() => setTheme(NEXT[theme])}
      title="表示テーマを切り替え(自動→ライト→ダーク)"
    >
      テーマ: {LABELS[theme]}
    </button>
  );
}
