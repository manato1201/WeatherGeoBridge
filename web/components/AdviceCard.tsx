"use client";

import type { AdviceItem } from "@/lib/advice";

export function AdviceCard({ advice }: { advice: AdviceItem[] }) {
  return (
    <div
      className="card"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-12)",
      }}
    >
      <p className="stat-block__label" style={{ margin: 0 }}>
        今日のアドバイス
      </p>
      <ul
        style={{
          margin: 0,
          padding: 0,
          listStyle: "none",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-8)",
        }}
      >
        {advice.map((item, i) => (
          <li
            key={i}
            style={{
              display: "flex",
              gap: "var(--space-8)",
              alignItems: "flex-start",
              fontSize: "var(--text-body)",
            }}
          >
            <span aria-hidden="true">{item.icon}</span>
            <span>{item.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
