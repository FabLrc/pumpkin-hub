"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { LogOut, User, ChevronDown, LayoutDashboard, Shield, Menu, X, Wrench } from "lucide-react";
import { useCurrentUser } from "@/lib/hooks";
import { logout } from "@/lib/api";
import { NotificationBell } from "@/components/notifications/NotificationBell";

async function handleLogout() {
  await logout();
  globalThis.location.href = "/";
}

export function Navbar() {
  const { data: user, isLoading } = useCurrentUser();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  function navLinkClass(href: string, accent = false) {
    const isActive = pathname === href || (href !== "/" && pathname.startsWith(href));
    if (accent) {
      return `transition-colors ${isActive ? "text-accent-light" : "text-accent hover:text-accent-light"}`;
    }
    return `transition-colors border-b-2 pb-px ${isActive ? "border-accent text-text-primary" : "border-transparent text-text-subtle hover:text-text-primary"}`;
  }

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <nav className="border-b border-border-default sticky top-0 z-50 bg-bg-base/95 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-3" onClick={() => setIsMobileMenuOpen(false)}>
            <Image
              src="/pumpkinhub_logo.png"
              alt="Pumpkin Hub logo"
              width={28}
              height={28}
              className="w-7 h-7 object-cover"
            />
            <span className="font-raleway font-bold text-sm tracking-widest uppercase text-text-primary">
              Pumpkin Hub
            </span>
          </Link>
          <span className="font-mono text-xs text-text-muted border border-border-default px-2 py-0.5">
            beta
          </span>
        </div>

        {/* Nav links — desktop only */}
        <div className="hidden md:flex items-center gap-8 text-xs font-raleway font-semibold tracking-widest uppercase">
          <Link href="/explorer" className={navLinkClass("/explorer")}>
            Explorer
          </Link>
          <a
            href="https://fablrc.github.io/pumpkin-hub/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-text-subtle hover:text-text-primary transition-colors border-b-2 border-transparent pb-px"
          >
            Docs
          </a>
          <Link href="/server-builder" className={navLinkClass("/server-builder")}>
            Server Builder
          </Link>
          <Link href="/studio" className={navLinkClass("/studio")}>
            Studio
          </Link>
          <Link href="/plugins/new" className={navLinkClass("/plugins/new", true)}>
            Submit Plugin
          </Link>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {/* Hamburger button — mobile only */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-1.5 border border-border-default hover:border-border-hover transition-colors cursor-pointer"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? (
              <X className="w-4 h-4 text-text-dim" />
            ) : (
              <Menu className="w-4 h-4 text-text-dim" />
            )}
          </button>

          {/* Discord */}
          <a
            href="https://discord.gg/NwrKApx7p8"
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 border border-border-default hover:border-border-hover transition-colors"
            aria-label="Pumpkin Hub Discord"
          >
            <svg className="w-4 h-4 text-text-dim" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
            </svg>
          </a>

          {/* GitHub */}
          <a
            href="https://github.com/FabLrc/pumpkin-hub"
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 border border-border-default hover:border-border-hover transition-colors"
            aria-label="Pumpkin MC GitHub"
          >
            <svg className="w-4 h-4 text-text-dim" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
            </svg>
          </a>

          {/* Auth */}
          {isLoading && (
            <div className="w-20 h-8 bg-bg-surface border border-border-default animate-pulse" />
          )}
          {!isLoading && user && (
            <>
              <NotificationBell />
              <div ref={menuRef} className="relative">
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  onKeyDown={(e) => { if (e.key === "Escape") setIsMenuOpen(false); }}
                  aria-expanded={isMenuOpen}
                  aria-haspopup="menu"
                  aria-label="User menu"
                  className="flex items-center gap-2 px-2 py-1.5 border border-border-default hover:border-border-hover transition-colors cursor-pointer"
                >
                  {user.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={user.avatar_url}
                      alt={user.username}
                      width={24}
                      height={24}
                      className="w-6 h-6 object-cover"
                    />
                  ) : (
                    <User className="w-4 h-4 text-text-dim" />
                  )}
                  <span className="font-mono text-xs text-text-primary hidden sm:inline">
                    {user.username}
                  </span>
                  <ChevronDown className="w-3 h-3 text-text-dim" />
                </button>

                {isMenuOpen && (
                  <div role="menu" className="absolute right-0 top-full mt-1 w-48 bg-bg-elevated border border-border-default z-50">
                    <div className="px-3 py-2 border-b border-border-default">
                      <div className="font-mono text-xs text-text-primary truncate">
                        {user.display_name ?? user.username}
                      </div>
                      <div className="font-mono text-xs text-text-muted truncate">
                        @{user.username}
                      </div>
                    </div>
                    <Link
                      href="/profile"
                      onClick={() => setIsMenuOpen(false)}
                      className="w-full flex items-center gap-2 px-3 py-2 font-mono text-xs text-text-dim hover:text-text-primary hover:bg-bg-surface transition-colors"
                    >
                      <User className="w-3.5 h-3.5" />
                      Profile
                    </Link>
                    <Link
                      href="/dashboard"
                      onClick={() => setIsMenuOpen(false)}
                      className="w-full flex items-center gap-2 px-3 py-2 font-mono text-xs text-text-dim hover:text-text-primary hover:bg-bg-surface transition-colors"
                    >
                      <LayoutDashboard className="w-3.5 h-3.5" />
                      Dashboard
                    </Link>
                    <Link
                      href="/dashboard/server-builder"
                      onClick={() => setIsMenuOpen(false)}
                      className="w-full flex items-center gap-2 px-3 py-2 font-mono text-xs text-text-dim hover:text-text-primary hover:bg-bg-surface transition-colors"
                    >
                      <Wrench className="w-3.5 h-3.5" />
                      My Server Builds
                    </Link>
                    {(user.role === "admin" || user.role === "moderator") && (
                      <Link
                        href="/admin"
                        onClick={() => setIsMenuOpen(false)}
                        className="w-full flex items-center gap-2 px-3 py-2 font-mono text-xs text-accent hover:text-accent hover:bg-bg-surface transition-colors"
                      >
                        <Shield className="w-3.5 h-3.5" />
                        Admin Panel
                      </Link>
                    )}
                    <div className="border-t border-border-default">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-3 py-2 font-mono text-xs text-text-dim hover:text-text-primary hover:bg-bg-surface transition-colors cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
          {!isLoading && !user && (
            <Link
              href="/auth"
              className="text-xs font-mono text-text-subtle hover:text-text-primary transition-colors px-3 py-1.5 border border-border-default hover:border-border-hover"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>

      {/* Mobile menu dropdown */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-border-default bg-bg-base">
          <div className="px-6 py-4 space-y-1 font-raleway font-semibold text-sm tracking-widest uppercase">
            <Link
              href="/explorer"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block py-3 text-text-subtle hover:text-text-primary transition-colors border-b border-border-default"
            >
              Explorer
            </Link>
            <a
              href="https://fablrc.github.io/pumpkin-hub/"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block py-3 text-text-subtle hover:text-text-primary transition-colors border-b border-border-default"
            >
              Docs
            </a>
            <Link
              href="/server-builder"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block py-3 text-text-subtle hover:text-text-primary transition-colors border-b border-border-default"
            >
              Server Builder
            </Link>
            <Link
              href="/studio"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block py-3 text-text-subtle hover:text-text-primary transition-colors border-b border-border-default"
            >
              Studio
            </Link>
            <Link
              href="/plugins/new"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block py-3 text-accent hover:text-accent-light transition-colors"
            >
              Submit Plugin
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
