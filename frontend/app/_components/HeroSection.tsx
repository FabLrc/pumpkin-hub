"use client";

import { useRouter } from "next/navigation";
import { useState, useRef, useEffect, useCallback, useSyncExternalStore } from "react";
import { Terminal } from "lucide-react";
import Image from "next/image";
import { useInView, useCountUp } from "@/lib/useCountUp";

interface HeroSectionProps {
  readonly totalPlugins: number;
  readonly totalAuthors: number;
  readonly totalDownloads: number;
}

const noopSubscribe = () => () => {};
function getIsMacSnapshot() {
  return navigator.userAgent.toUpperCase().includes("MAC");
}
function getIsMacServerSnapshot() {
  return true;
}

export function HeroSection({ totalPlugins, totalAuthors, totalDownloads }: HeroSectionProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const isMac = useSyncExternalStore(noopSubscribe, getIsMacSnapshot, getIsMacServerSnapshot);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const flashRef = useRef<HTMLDivElement>(null);

  const { ref: statsRef, inView: statsInView } = useInView(0.3);
  const animPlugins = useCountUp(totalPlugins, statsInView);
  const animAuthors = useCountUp(totalAuthors, statsInView);
  const animDownloads = useCountUp(totalDownloads, statsInView);

  const focusSearchInput = useCallback(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  // Global Cmd+K / Ctrl+K shortcut
  useEffect(() => {
    function handleGlobalKeydown(event: KeyboardEvent) {
      const isModifier = event.metaKey || event.ctrlKey;
      if (isModifier && event.key === "k") {
        event.preventDefault();
        focusSearchInput();
      }
    }

    document.addEventListener("keydown", handleGlobalKeydown);
    return () => document.removeEventListener("keydown", handleGlobalKeydown);
  }, [focusSearchInput]);

  useEffect(() => {
    /* c8 ignore start */
    const canvas = canvasRef.current;
    const flashEl = flashRef.current;
    if (!canvas) return;

    const reduceMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = canvas.offsetWidth;
    let h = canvas.offsetHeight;
    let dpr = window.devicePixelRatio || 1;

    function applySize() {
      if (!canvas || !ctx) return;
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      w = canvas.offsetWidth;
      h = canvas.offsetHeight;
      canvas.width = Math.max(1, Math.floor(w * dpr));
      canvas.height = Math.max(1, Math.floor(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    applySize();

    const ro =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(applySize) : null;
    ro?.observe(canvas);

    let visible = true;
    const io =
      typeof IntersectionObserver !== "undefined"
        ? new IntersectionObserver((entries) => {
            visible = entries[0]?.isIntersecting ?? true;
          })
        : null;
    io?.observe(canvas);

    const rand = (min: number, max: number) => Math.random() * (max - min) + min;

    function gauss(mean: number, std: number) {
      const u = 1 - Math.random();
      const v = Math.random();
      const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
      return mean + z * std;
    }

    interface Point {
      x: number;
      y: number;
    }

    interface Bolt {
      points: Point[];
      thickness: number;
      opacity: number;
      spawnTime: number;
      flashType: "single" | "double";
      plasma: boolean;
    }

    function generatePoints(startX: number, startY: number): Point[] {
      const points: Point[] = [{ x: startX, y: startY }];
      let x = startX;
      let y = startY;
      let bias = 0;
      const maxSegs = 90;

      for (let i = 0; i < maxSegs; i++) {
        if (Math.random() < 0.15) {
          bias = (Math.random() - 0.5) * 100;
        }
        const segLen = rand(20, 45);
        const jitter = (Math.random() - 0.5) * 35;
        x += bias + jitter;
        y += Math.max(8, segLen);
        x = Math.max(10, Math.min(w - 10, x));
        points.push({ x, y });
        bias *= 0.85;
        if (y > h + 60) break;
      }
      const last = points[points.length - 1]!;
      if (last.y < h + 10) {
        points.push({ x: last.x + (Math.random() - 0.5) * 30, y: h + 20 });
      }
      return points;
    }

    function createBolt(
      startX: number,
      startY: number,
      thickness: number,
      flashType: Bolt["flashType"],
      now: number,
    ): Bolt {
      return {
        points: generatePoints(startX, startY),
        thickness,
        opacity: 1,
        spawnTime: now,
        flashType,
        plasma: false,
      };
    }

    const bolts: Bolt[] = [];
    let nextStrike = rand(300, 1500);
    let lastTime = 0;
    let animId = 0;
    let burstMode = false;
    let burstRemaining = 0;

    function scheduleNext() {
      if (burstMode) {
        burstRemaining--;
        if (burstRemaining <= 0) {
          burstMode = false;
        nextStrike = rand(1000, 3000);
        } else {
          nextStrike = rand(150, 500);
        }
      } else if (Math.random() < 0.3) {
        burstMode = true;
        burstRemaining = Math.floor(rand(3, 7));
        nextStrike = rand(150, 500);
      } else {
        nextStrike = rand(1500, 4000);
      }
    }

    function triggerEnvFlash(intensity: number) {
      if (!flashEl) return;
      flashEl.style.transition = "none";
      flashEl.style.opacity = String(intensity);
      requestAnimationFrame(() => {
        if (!flashEl) return;
        flashEl.style.transition = "opacity 200ms ease-out";
        flashEl.style.opacity = "0";
      });
    }

    function spawnStrike(now: number) {
      let sx: number;
      if (Math.random() < 0.6) {
        sx = gauss(w * 0.65, w * 0.2);
      } else {
        sx = rand(20, w - 20);
      }
      sx = Math.max(20, Math.min(w - 20, sx));

      const flashType: Bolt["flashType"] = Math.random() < 0.5 ? "double" : "single";
      const baseThickness = rand(2.2, 4);
      const main = createBolt(sx, -10, baseThickness, flashType, now);
      bolts.push(main);

      const numBranches = Math.random() < 0.6 ? Math.floor(rand(1, 3)) : 0;
      for (let bi = 0; bi < numBranches; bi++) {
        if (main.points.length < 5) break;
        const idx = Math.floor(rand(2, main.points.length - 2));
        const origin = main.points[idx]!;
        const branch = createBolt(origin.x, origin.y, baseThickness * 0.55, "single", now);
        bolts.push(branch);

        if (Math.random() < 0.2 && branch.points.length > 4) {
          const idx2 = Math.floor(rand(2, branch.points.length - 2));
          const o2 = branch.points[idx2]!;
          const sub = createBolt(o2.x, o2.y, baseThickness * 0.3, "single", now);
          bolts.push(sub);
        }
      }

      triggerEnvFlash(flashType === "double" ? 0.16 : 0.11);
    }

    function tracePath(points: Point[], fromIdx: number, toIdx: number) {
      const start = points[fromIdx]!;
      ctx!.beginPath();
      ctx!.moveTo(start.x, start.y);
      for (let i = fromIdx + 1; i <= toIdx; i++) {
        const p = points[i]!;
        ctx!.lineTo(p.x, p.y);
      }
    }

    function drawBolt(b: Bolt) {
      const o = b.opacity;
      if (o <= 0.01) return;
      const points = b.points;
      if (points.length < 2) return;
      const n = points.length - 1;

      ctx!.save();
      ctx!.lineCap = "round";
      ctx!.lineJoin = "round";

      if (b.plasma) {
        ctx!.strokeStyle = `rgba(255, 140, 40, ${o * 0.6})`;
        ctx!.lineWidth = 1;
        ctx!.shadowColor = `rgba(249, 115, 22, ${o * 0.5})`;
        ctx!.shadowBlur = 4;
        tracePath(points, 0, n);
        ctx!.stroke();
        ctx!.restore();
        return;
      }

      const t = b.thickness;

      ctx!.strokeStyle = `rgba(249, 115, 22, ${o * 0.35})`;
      ctx!.lineWidth = t * 3;
      ctx!.shadowColor = `rgba(249, 115, 22, ${o * 0.85})`;
      ctx!.shadowBlur = 24;
      tracePath(points, 0, n);
      ctx!.stroke();

      ctx!.strokeStyle = `rgba(255, 200, 140, ${o * 0.75})`;
      ctx!.lineWidth = t * 1.6;
      ctx!.shadowColor = `rgba(255, 160, 80, ${o * 0.7})`;
      ctx!.shadowBlur = 10;
      tracePath(points, 0, n);
      ctx!.stroke();

      const third = Math.max(1, Math.floor(n / 3));
      const twoThirds = Math.max(third + 1, Math.floor((2 * n) / 3));
      ctx!.strokeStyle = `rgba(255, 255, 255, ${o})`;
      ctx!.shadowColor = `rgba(255, 240, 220, ${o})`;
      ctx!.shadowBlur = 4;

      ctx!.lineWidth = Math.max(0.6, t * 0.7);
      tracePath(points, 0, third);
      ctx!.stroke();

      ctx!.lineWidth = Math.max(0.5, t * 0.5);
      tracePath(points, third, twoThirds);
      ctx!.stroke();

      ctx!.lineWidth = Math.max(0.4, t * 0.3);
      tracePath(points, twoThirds, n);
      ctx!.stroke();

      ctx!.restore();
    }

    let prevHadBolts = false;

    function animate(time: number) {
      const dt = lastTime ? time - lastTime : 16;
      lastTime = time;

      if (!visible) {
        animId = requestAnimationFrame(animate);
        return;
      }

      if (bolts.length > 0 || prevHadBolts) {
        ctx!.clearRect(0, 0, w, h);
      }
      prevHadBolts = bolts.length > 0;

      for (let i = bolts.length - 1; i >= 0; i--) {
        const b = bolts[i]!;
        const age = time - b.spawnTime;

        if (!b.plasma && b.flashType === "double" && age < 200) {
          if (age < 50) b.opacity = 1;
          else if (age < 130) b.opacity = 0;
          else if (age < 180) b.opacity = 0.85;
          else b.opacity = 0.75;
        } else if (!b.plasma && b.flashType === "single" && age < 40) {
          b.opacity = 1;
        } else if (!b.plasma) {
          b.opacity *= 0.93;
          if (b.opacity < 0.06) {
            b.plasma = true;
            b.opacity = 0.4;
          }
        } else {
          b.opacity *= 0.92;
          if (b.opacity < 0.01) {
            bolts.splice(i, 1);
          }
        }
      }

      nextStrike -= dt;
      if (nextStrike <= 0) {
        spawnStrike(time);
        scheduleNext();
      }

      for (const b of bolts) {
        drawBolt(b);
      }

      animId = requestAnimationFrame(animate);
    }

    animId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animId);
      ro?.disconnect();
      io?.disconnect();
    };
    /* c8 ignore stop */
  }, []);

  function handleSearchKeydown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setSearchQuery("");
      inputRef.current?.blur();
    }
  }

  function handleSearchSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/explorer?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      router.push("/explorer");
    }
  }

  return (
    <section className="grid-bg relative overflow-hidden">
      {/* Vertical accent lines */}
      <div className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-accent/20 to-transparent" />
      <div className="absolute right-0 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-accent/20 to-transparent" />
      <canvas
        ref={canvasRef}
        className="hidden lg:block absolute top-0 right-0 h-full pointer-events-none z-0"
        style={{ width: "45%" }}
      />
      {/* Environmental flash overlay — pulses during each lightning strike */}
      <div
        ref={flashRef}
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          background:
            "radial-gradient(ellipse at 75% 30%, rgba(255,170,90,0.45), transparent 70%)",
          opacity: 0,
          transition: "opacity 200ms ease-out",
          willChange: "opacity",
        }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-16 sm:pt-20 lg:pt-24 pb-14 sm:pb-16 lg:pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-8 lg:gap-12 items-center">
          {/* Left column — text content */}
          <div className="min-w-0">
            {/* Label */}
            <div className="fade-up delay-1 flex items-center gap-3 mb-6 sm:mb-8">
              <div className="h-px w-8 sm:w-12 bg-accent shrink-0" />
              <span className="font-mono text-[10px] sm:text-xs text-accent tracking-widest uppercase">
                The Official Pumpkin MC Registry
              </span>
            </div>

            {/* Main title */}
            <h1
              className="fade-up delay-2 font-raleway font-black leading-none tracking-tight text-text-primary mb-5 sm:mb-6 max-w-4xl"
              style={{ fontSize: "clamp(2.75rem, 11vw, 8rem)" }}
            >
              FORGE YOUR
              <br />
              <span className="text-accent">SERVER.</span>
              <br />
              <span className="text-text-subtle">SHIP FAST.</span>
            </h1>

            <p className="fade-up delay-3 font-raleway text-text-subtle text-base sm:text-lg max-w-xl mb-8 sm:mb-12 leading-relaxed">
              The community registry for Pumpkin MC — the Minecraft server engine
              written in pure Rust. Browse, verify, and install plugins at the speed
              of compiled code.
            </p>

            {/* Command search bar */}
            <form onSubmit={handleSearchSubmit} className="fade-up delay-4 max-w-2xl glow-orange">
              <div className="border border-border-hover bg-bg-elevated flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3 sm:py-4 hover:border-border-hover transition-colors">
                <Terminal className="text-accent flex-shrink-0 w-[18px] h-[18px]" />
                <input
                  ref={inputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleSearchKeydown}
                  placeholder={`Search plugins... (${isMac ? "⌘" : "Ctrl+"}K)`}
                  className="search-input min-w-0 flex-1 bg-transparent font-mono text-sm text-text-primary placeholder-text-dim border-0 outline-none"
                  aria-label="Search plugins"
                />
                <div className="hidden sm:flex items-center gap-2 shrink-0">
                  <kbd className="font-mono text-[10px] text-text-dim border border-border-default px-1.5 py-0.5">
                    {isMac ? "⌘" : "Ctrl"}
                  </kbd>
                  <kbd className="font-mono text-[10px] text-text-dim border border-border-default px-1.5 py-0.5">
                    K
                  </kbd>
                </div>
              </div>
              {/* Search suggestions */}
              <div className="border border-t-0 border-border-default bg-bg-elevated/80">
                <div className="px-4 sm:px-5 py-2 flex items-center gap-3 sm:gap-6 overflow-x-auto">
                  <span className="font-mono text-xs text-text-muted uppercase tracking-widest shrink-0">
                    Popular:
                  </span>
                  <div className="flex items-center gap-2 sm:gap-3 shrink-0">
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
                          className="font-mono text-xs text-text-subtle hover:text-accent transition-colors px-2 py-0.5 border border-border-default hover:border-accent/50 shrink-0"
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
                src="/pumpkin-hub-soldier-pumpkin-netherite.webp"
                alt="Pumpkin soldier in netherite armor"
                fill
                priority
                className="object-contain object-bottom"
              />
              <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#0a0a0a] to-transparent pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div
          ref={statsRef}
          className="mt-10 sm:mt-12 grid grid-cols-3 gap-3 sm:gap-6 lg:flex lg:items-center lg:gap-8 fade-up delay-4"
        >
          <div className="border-l-2 border-accent pl-3 sm:pl-4 min-w-0">
            <div className="font-mono text-lg sm:text-xl lg:text-2xl font-bold text-text-primary truncate">
              {totalPlugins > 0 ? animPlugins.toLocaleString() : "—"}
            </div>
            <div className="font-mono text-[10px] sm:text-xs text-text-muted uppercase tracking-widest">
              Plugins
            </div>
          </div>
          <div className="border-l border-border-default pl-3 sm:pl-4 lg:pl-8 min-w-0">
            <div className="font-mono text-lg sm:text-xl lg:text-2xl font-bold text-text-primary truncate">
              {totalAuthors > 0 ? animAuthors.toLocaleString() : "—"}
            </div>
            <div className="font-mono text-[10px] sm:text-xs text-text-muted uppercase tracking-widest">
              Authors
            </div>
          </div>
          <div className="border-l border-border-default pl-3 sm:pl-4 lg:pl-8 min-w-0">
            <div className="font-mono text-lg sm:text-xl lg:text-2xl font-bold text-text-primary truncate">
              {totalDownloads > 0 ? animDownloads.toLocaleString() : "—"}
            </div>
            <div className="font-mono text-[10px] sm:text-xs text-text-muted uppercase tracking-widest">
              Downloads
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
