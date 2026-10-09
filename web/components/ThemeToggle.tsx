"use client";

import { useTheme } from "@/lib/ThemeContext";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const next = resolvedTheme === "dark" ? "light" : "dark";

  return (
    <button
      className="btn btn--outline"
      type="button"
      onClick={() => setTheme(next)}
      title={`${next === "dark" ? "ダーク" : "ライト"}テーマに切り替え`}
    >
      テーマ: {resolvedTheme === "dark" ? "ダーク" : "ライト"}
    </button>
  );
}
