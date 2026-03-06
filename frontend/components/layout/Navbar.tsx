import Link from "next/link";

export function Navbar() {
  return (
    <nav className="border-b border-border-default sticky top-0 z-50 bg-bg-base/95 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-7 h-7 bg-accent flex items-center justify-center">
              <span className="text-black font-mono font-bold text-xs">
                PH
              </span>
            </div>
            <span className="font-raleway font-bold text-sm tracking-widest uppercase text-text-primary">
              Pumpkin Hub
            </span>
          </Link>
          <span className="font-mono text-[10px] text-text-dim border border-border-default px-2 py-0.5">
            v0.4.0-beta
          </span>
        </div>

        {/* Nav links */}
        <div className="hidden md:flex items-center gap-8 text-xs font-raleway font-semibold tracking-widest uppercase text-text-subtle">
          <Link
            href="/explorer"
            className="hover:text-text-primary transition-colors"
          >
            Explorer
          </Link>
          <a href="#" className="hover:text-text-primary transition-colors">
            Docs
          </a>
          <a href="#" className="hover:text-text-primary transition-colors">
            Status
          </a>
          <a
            href="#"
            className="text-accent hover:text-accent-light transition-colors"
          >
            Submit Plugin
          </a>
        </div>

        {/* Auth */}
        <div className="flex items-center gap-3">
          <button className="text-xs font-mono text-text-subtle hover:text-text-primary transition-colors px-3 py-1.5 border border-border-default hover:border-border-hover">
            Sign In
          </button>
        </div>
      </div>
    </nav>
  );
}
