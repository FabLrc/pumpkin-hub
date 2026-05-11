"use client";

import { usePlugins } from "@/lib/hooks";

const STATIC_TEXT =
  "LATEST: New plugins available · 98.7% uptime · Powered by Rust · Pumpkin MC community registry · SHA-256 verified binaries · ";

export function Ticker() {
  const { data } = usePlugins({ sort_by: "created_at", order: "desc", per_page: 3 });

  const text =
    data && data.data.length > 0
      ? data.data
          .map((p) => `NEW: ${p.name} by ${p.author.username}`)
          .join(" · ") + " · 98.7% uptime · Powered by Rust · SHA-256 verified binaries · "
      : STATIC_TEXT;

  return (
    <div className="border-b border-border-default overflow-hidden bg-bg-elevated/50 h-8 flex items-center">
      <div className="ticker-track flex gap-0 whitespace-nowrap">
        <span className="inline-flex items-center gap-8 px-8 font-mono text-[10px] text-text-dim">
          <span className="text-accent">▶</span> {text}
          <span className="text-accent">▶</span> {text}
        </span>
        <span className="inline-flex items-center gap-8 px-8 font-mono text-[10px] text-text-dim">
          <span className="text-accent">▶</span> {text}
          <span className="text-accent">▶</span> {text}
        </span>
      </div>
    </div>
  );
}
