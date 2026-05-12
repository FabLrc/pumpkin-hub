import { Check } from "lucide-react";
import { PreviewFrame } from "./PreviewFrame";

const CHECKS = [
  { label: "SHA-256 verified", value: "a3f1b8e2…c9e2f014" },
  { label: "Vulnerability scan passed", value: "0 critical · 0 high" },
  { label: "Cross-platform .wasm ready", value: "win · macos · linux" },
];

export function DeployPreview() {
  return (
    <PreviewFrame label="verify">
      <div className="font-mono text-xs md:text-sm">
        <div className="flex items-center justify-between mb-5">
          <span className="text-text-dim text-[10px] uppercase tracking-widest">
            {"// pre-publication checks"}
          </span>
          <span className="px-1.5 py-0.5 bg-accent/10 border border-accent/30 text-accent text-[9px] uppercase tracking-wider">
            ready
          </span>
        </div>

        <div className="space-y-3">
          {CHECKS.map((c) => (
            <div
              key={c.label}
              className="border border-border-default bg-bg-elevated/60 p-3 fade-up"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="w-4 h-4 border border-success/40 bg-success/10 flex items-center justify-center">
                  <Check className="text-success w-3 h-3" strokeWidth={3} />
                </span>
                <span className="text-text-primary">{c.label}</span>
              </div>
              <div className="text-text-dim text-[10px] pl-6">{c.value}</div>
            </div>
          ))}
        </div>

        <div className="pt-5 mt-5 border-t border-border-default flex items-center justify-between">
          <span className="text-text-dim text-[10px] uppercase tracking-widest">
            {"// trust"}
          </span>
          <span className="text-accent text-[10px]">
            one binary · every platform
          </span>
        </div>
      </div>
    </PreviewFrame>
  );
}
