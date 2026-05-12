import type { ReactNode } from "react";

interface PreviewFrameProps {
  label: string;
  children: ReactNode;
  className?: string;
}

export function PreviewFrame({ label, children, className }: PreviewFrameProps) {
  return (
    <div
      className={`border border-border-default bg-bg-deep h-full flex flex-col ${className ?? ""}`}
    >
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border-default bg-bg-surface/60">
        <div className="flex gap-1.5">
          <span className="w-2.5 h-2.5 bg-border-default" />
          <span className="w-2.5 h-2.5 bg-border-default" />
          <span className="w-2.5 h-2.5 bg-accent/40" />
        </div>
        <span className="font-mono text-[10px] text-text-dim tracking-widest uppercase">
          {label}
        </span>
      </div>
      <div className="flex-1 p-5 md:p-6 overflow-hidden">{children}</div>
    </div>
  );
}
