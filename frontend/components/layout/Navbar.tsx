"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { LogOut, User, ChevronDown } from "lucide-react";
import { useCurrentUser } from "@/lib/hooks";
import { getGithubLoginUrl, getLogoutUrl } from "@/lib/api";

export function Navbar() {
  const { data: user, isLoading } = useCurrentUser();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
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

  function handleLogout() {
    window.location.href = getLogoutUrl();
  }

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
          {isLoading ? (
            <div className="w-20 h-8 bg-bg-surface border border-border-default animate-pulse" />
          ) : user ? (
            <div ref={menuRef} className="relative">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="flex items-center gap-2 px-2 py-1.5 border border-border-default hover:border-border-hover transition-colors cursor-pointer"
              >
                {user.avatar_url ? (
                  <Image
                    src={user.avatar_url}
                    alt={user.username}
                    width={24}
                    height={24}
                    className="w-6 h-6"
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
                <div className="absolute right-0 top-full mt-1 w-48 bg-bg-elevated border border-border-default z-50">
                  <div className="px-3 py-2 border-b border-border-default">
                    <div className="font-mono text-xs text-text-primary truncate">
                      {user.display_name ?? user.username}
                    </div>
                    <div className="font-mono text-[10px] text-text-dim truncate">
                      @{user.username}
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2 font-mono text-xs text-text-dim hover:text-text-primary hover:bg-bg-surface transition-colors cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <a
              href={getGithubLoginUrl()}
              className="text-xs font-mono text-text-subtle hover:text-text-primary transition-colors px-3 py-1.5 border border-border-default hover:border-border-hover"
            >
              Sign In
            </a>
          )}
        </div>
      </div>
    </nav>
  );
}
