export function Footer() {
  return (
    <footer className="border-t border-border-default bg-bg-elevated/30">
      <div className="max-w-7xl mx-auto px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 bg-accent flex items-center justify-center">
            <span className="text-black font-mono font-bold text-[8px]">
              PH
            </span>
          </div>
          <span className="font-mono text-xs text-text-dim">
            Pumpkin Hub &copy; 2025 — Community-driven. Open source.
          </span>
        </div>
        <div className="flex items-center gap-6 font-mono text-xs text-text-dim">
          <a
            href="https://github.com/Snowiiii/Pumpkin"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-text-primary transition-colors"
          >
            GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}
