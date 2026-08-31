import Image from "next/image";

export function Footer() {
  return (
    <footer className="border-t border-border-default bg-bg-elevated/30">
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <Image
              src="/pumpkinhub_logo.png"
              alt="Pumpkin Hub logo"
              width={20}
              height={20}
              className="w-5 h-5 object-cover"
            />
            <span className="font-mono text-xs text-text-dim">
              Pumpkin Hub &copy; 2026 — Community-driven. Open source.
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-6 font-mono text-xs text-text-dim">
            <a
              href="https://fablrc.github.io/pumpkin-hub/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-text-primary transition-colors"
            >
              Docs
            </a>
            <a
              href="https://discord.gg/NwrKApx7p8"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-text-primary transition-colors"
            >
              Discord
            </a>
            <a
              href="https://github.com/FabLrc/pumpkin-hub"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-text-primary transition-colors"
            >
              GitHub
            </a>
            <span className="hidden md:block h-3 w-px bg-border-default" />
            <a
              href="https://github.com/FabLrc/pumpkin-hub/blob/master/docs/PRIVACY.md"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-text-primary transition-colors"
            >
              Privacy
            </a>
            <a
              href="https://github.com/FabLrc/pumpkin-hub/blob/master/docs/TERMS.md"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-text-primary transition-colors"
            >
              Terms
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
