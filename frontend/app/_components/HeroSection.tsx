"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Terminal } from "lucide-react";
import Image from "next/image";

interface HeroSectionProps {
  totalPlugins: number;
}

export function HeroSection({ totalPlugins }: HeroSectionProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  function handleSearchSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/explorer?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  }

  return (
    <section className="grid-bg relative overflow-hidden">
      {/* Vertical accent lines */}
      <div className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-accent/20 to-transparent" />
      <div className="absolute right-0 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-accent/20 to-transparent" />

      <div className="max-w-7xl mx-auto px-6 pt-24 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-12 items-center">
          {/* Left column — text content */}
          <div>
            {/* Label */}
            <div className="fade-up delay-1 flex items-center gap-3 mb-8">
              <div className="h-px w-12 bg-accent" />
              <span className="font-mono text-xs text-accent tracking-widest uppercase">
                The Official Pumpkin MC Registry
              </span>
            </div>

            {/* Main title */}
            <h1 className="fade-up delay-2 font-raleway font-black text-6xl md:text-8xl leading-none tracking-tight text-text-primary mb-6 max-w-4xl">
              FORGE YOUR
              <br />
              <span className="text-accent">SERVER.</span>
              <br />
              <span className="text-text-subtle">SHIP FAST.</span>
            </h1>

            <p className="fade-up delay-3 font-raleway text-text-subtle text-lg max-w-xl mb-12 leading-relaxed">
              The community registry for Pumpkin MC — the Minecraft server engine
              written in pure Rust. Browse, verify, and install plugins at the speed
              of compiled code.
            </p>

            {/* Command search bar */}
            <form onSubmit={handleSearchSubmit} className="fade-up delay-4 max-w-2xl glow-orange">
              <div className="border border-border-hover bg-bg-elevated flex items-center gap-4 px-5 py-4 hover:border-border-hover transition-colors">
                <Terminal className="text-accent flex-shrink-0 w-[18px] h-[18px]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search plugins, authors, tags... (⌘K)"
                  className="search-input flex-1 bg-transparent font-mono text-sm text-text-primary placeholder-text-dim border-0 outline-none"
                />
                <div className="flex items-center gap-2">
                  <kbd className="font-mono text-[10px] text-text-dim border border-border-default px-1.5 py-0.5">
                    ⌘
                  </kbd>
                  <kbd className="font-mono text-[10px] text-text-dim border border-border-default px-1.5 py-0.5">
                    K
                  </kbd>
                </div>
              </div>
              {/* Search suggestions */}
              <div className="border border-t-0 border-border-default bg-bg-elevated/80">
                <div className="px-5 py-2 flex items-center gap-6">
                  <span className="font-mono text-[10px] text-text-dim uppercase tracking-widest">
                    Popular:
                  </span>
                  <div className="flex items-center gap-3">
                    {["#protection", "#economy", "#world-gen", "#auth"].map(
                      (tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() =>
                            router.push(
                              `/explorer?q=${encodeURIComponent(tag.slice(1))}`,
                            )
                          }
                          className="font-mono text-xs text-text-subtle hover:text-accent transition-colors px-2 py-0.5 border border-border-default hover:border-accent/50"
                        >
                          {tag}
                        </button>
                      ),
                    )}
                  </div>
                </div>
              </div>
            </form>
          </div>

          {/* Right column — hero image */}
          <div className="hidden lg:block relative fade-up delay-3 self-stretch">
            <div className="relative h-full min-h-[500px] w-[480px]">
              <Image
                src="/pumpkin-hub-soldier-pumpkin-netherite.png"
                alt="Pumpkin soldier in netherite armor"
                fill
                priority
                className="object-contain object-bottom"
              />
              {/* Fade-out gradient at the bottom */}
              <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#0a0a0a] to-transparent pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="mt-12 flex items-center gap-8 fade-up delay-4">
          <div className="border-l-2 border-accent pl-4">
            <div className="font-mono text-2xl font-bold text-text-primary">
              {totalPlugins > 0 ? totalPlugins.toLocaleString() : "—"}
            </div>
            <div className="font-mono text-[10px] text-text-dim uppercase tracking-widest">
              Plugins
            </div>
          </div>
          <div className="border-l border-border-default pl-8">
            <div className="font-mono text-2xl font-bold text-text-primary">
              —
            </div>
            <div className="font-mono text-[10px] text-text-dim uppercase tracking-widest">
              Authors
            </div>
          </div>
          <div className="border-l border-border-default pl-8">
            <div className="font-mono text-2xl font-bold text-text-primary">
              —
            </div>
            <div className="font-mono text-[10px] text-text-dim uppercase tracking-widest">
              Downloads
            </div>
          </div>
          <div className="border-l border-border-default pl-8">
            <div className="font-mono text-2xl font-bold text-text-primary">
              0.38s
            </div>
            <div className="font-mono text-[10px] text-text-dim uppercase tracking-widest">
              Avg Build
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
