export function Ticker() {
  const text =
    "LATEST: New plugins available · 98.7% uptime · Powered by Rust · Pumpkin MC community registry · SHA-256 verified binaries · ";

  return (
    <div className="border-b border-border-default overflow-hidden bg-bg-elevated/50 h-8 flex items-center">
      <div className="ticker-track flex gap-0 whitespace-nowrap">
        {/* Duplicated for seamless loop */}
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
