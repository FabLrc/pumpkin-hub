"use client";

import { useEffect, useState } from "react";
import { PreviewFrame } from "./PreviewFrame";
import { prefersReducedMotion, useInView } from "./useInView";

const COMMAND = "pumpkin-hub search worldedit";
const RESULTS = [
  { name: "worldedit-pumpkin", author: "@enginehouse", downloads: "12,481" },
  { name: "fast-worldedit", author: "@redstone-labs", downloads: "8,209" },
  { name: "wedit-lite", author: "@mossy", downloads: "3,127" },
];

export function TerminalPreview({ active }: { active: boolean }) {
  const [ref, inView] = useInView<HTMLDivElement>({ threshold: 0.3 });
  const [typed, setTyped] = useState("");
  const [shownResults, setShownResults] = useState(0);

  useEffect(() => {
    if (!active || !inView) return;
    if (prefersReducedMotion()) {
      setTyped(COMMAND);
      setShownResults(RESULTS.length);
      return;
    }

    setTyped("");
    setShownResults(0);

    let i = 0;
    const typing = setInterval(() => {
      i++;
      setTyped(COMMAND.slice(0, i));
      if (i >= COMMAND.length) {
        clearInterval(typing);
        let r = 0;
        const reveal = setInterval(() => {
          r++;
          setShownResults(r);
          if (r >= RESULTS.length) clearInterval(reveal);
        }, 280);
      }
    }, 55);

    return () => clearInterval(typing);
  }, [active, inView]);

  return (
    <div ref={ref} className="h-full">
      <PreviewFrame label="terminal">
        <div className="font-mono text-xs md:text-sm space-y-3" aria-label="Terminal output preview">
          <div className="flex items-center gap-2">
            <span className="text-accent">$</span>
            <span className="text-text-secondary">
              {typed}
              <span className="inline-block w-2 h-3.5 bg-accent ml-0.5 align-middle animate-pulse" />
            </span>
          </div>
          {typed === COMMAND && (
            <div className="text-text-dim text-[10px] uppercase tracking-widest pt-1">
              {"// 3 results"}
            </div>
          )}
          <div className="space-y-2">
            {RESULTS.slice(0, shownResults).map((r) => (
              <div
                key={r.name}
                className="flex items-center justify-between border border-border-default px-3 py-2 bg-bg-elevated/60 fade-up"
              >
                <div>
                  <div className="text-text-primary">{r.name}</div>
                  <div className="text-text-dim text-[10px]">{r.author}</div>
                </div>
                <div className="text-accent text-[10px]">↓ {r.downloads}</div>
              </div>
            ))}
          </div>
        </div>
      </PreviewFrame>
    </div>
  );
}
