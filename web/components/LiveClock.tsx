"use client";

import { useEffect, useState } from "react";

// 参考スタイルの「Digital Time Readout」を模した、常時更新するローカル時刻表示。
// エンジニアのターミナル的な質感を補強するための演出(実データには影響しない)。
export function LiveClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!now) return null;

  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");

  return (
    <div style={{ textAlign: "right" }}>
      <p
        style={{
          margin: 0,
          fontFamily: "var(--font-mono)",
          fontSize: "var(--text-heading-sm)",
          letterSpacing: "-0.5px",
          lineHeight: 1,
        }}
      >
        {hh}:{mm}
        <span className="live-clock__seconds" style={{ opacity: 0.5 }}>
          :{ss}
        </span>
      </p>
      <p className="text-caption" style={{ margin: 0 }}>
        LOCAL TIME
      </p>
    </div>
  );
}
