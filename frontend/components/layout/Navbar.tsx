"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { LogOut, User, ChevronDown, LayoutDashboard, Shield, Menu, X } from "lucide-react";
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
            <div className="w-7 h-7 bg-accent flex items-center justify-center">
              <span className="text-black font-mono font-bold text-xs">
                PH
              </span>
            </div>
            <span className="font-raleway font-bold text-sm tracking-widest uppercase text-text-primary">
              Pumpkin Hub
            </span>
          </Link>
          <span className="font-mono text-xs text-text-muted border border-border-default px-2 py-0.5">
            beta
          </span>
        </div>

        {/* Nav links — desktop only */}
        <div className="hidden md:flex items-center gap-8 text-xs font-raleway font-semibold tracking-widest uppercase text-text-subtle">
          <Link
            href="/explorer"
            className="hover:text-text-primary transition-colors"
          >
            Explorer
          </Link>
          <a
            href="https://fablrc.github.io/pumpkin-hub/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-text-primary transition-colors"
          >
            Docs
          </a>
          <Link
            href="/plugins/new"
            className="text-accent hover:text-accent-light transition-colors"
          >
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
