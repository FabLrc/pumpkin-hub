"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { PreviewFrame } from "./PreviewFrame";
import { prefersReducedMotion, useInView } from "./useInView";

interface Check {
  label: string;
  finalValue: string;
}

const CHECKS: Check[] = [
  { label: "SHA-256 verified", finalValue: "a3f1b8e2…c9e2f014" },
  { label: "Vulnerability scan passed", finalValue: "0 critical · 0 high" },
  { label: "Cross-platform .wasm ready", finalValue: "win · macos · linux" },
];

const SCRAMBLE_CHARS = "abcdef0123456789·";

function scramble(target: string, progress: number): string {
  if (progress >= 1) return target;
  const revealCount = Math.floor(target.length * progress);
  let out = "";
  for (let i = 0; i < target.length; i++) {
    const ch = target[i];
    if (i < revealCount || ch === " " || ch === "·") {
      out += ch;
    } else {
      out += SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
    }
  }
  return out;
}

type RowState = "idle" | "scanning" | "verified";

interface RowProps {
  check: Check;
  state: RowState;
  index: number;
}

function CheckRow({ check, state, index }: RowProps) {
  const [displayValue, setDisplayValue] = useState(check.finalValue);
  const verified = state === "verified";
  const scanning = state === "scanning";

  useEffect(() => {
    if (state === "idle") {
      const t = setTimeout(() => setDisplayValue(check.finalValue), 0);
      return () => clearTimeout(t);
    }
    if (state === "verified") {
      if (prefersReducedMotion()) {
        const t = setTimeout(() => setDisplayValue(check.finalValue), 0);
        return () => clearTimeout(t);
      }
      const start = performance.now();
      const duration = 600;
      let raf = 0;
      const tick = (now: number) => {
        const t = Math.min((now - start) / duration, 1);
        setDisplayValue(scramble(check.finalValue, t));
        if (t < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(raf);
    }
    // scanning → keep scrambled
    if (prefersReducedMotion()) return;
    let raf = 0;
    const tick = () => {
      setDisplayValue(scramble(check.finalValue, 0));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [state, check.finalValue]);

  return (
    <div
      className={`relative border bg-bg-elevated/60 p-3 overflow-hidden transition-all duration-500 ${
        verified
          ? "border-success/30 opacity-100 translate-y-0"
          : scanning
            ? "border-accent/40 opacity-100 translate-y-0"
            : "border-border-default/40 opacity-50 translate-y-1"
      }`}
      style={{ transitionDelay: state === "idle" ? `${index * 50}ms` : "0ms" }}
    >
      {scanning && (
        <div
          className="absolute inset-x-0 top-0 h-px bg-accent shadow-[0_0_8px_rgba(249,115,22,0.8)]"
          style={{
            animation: "scanBeam 1.2s cubic-bezier(0.45, 0, 0.55, 1) infinite",
          }}
        />
      )}

      <div className="flex items-center gap-2 mb-1">
        <span
          className={`w-4 h-4 border flex items-center justify-center transition-colors duration-300 ${
            verified
              ? "border-success/40 bg-success/10"
              : scanning
                ? "border-accent/50 bg-accent/10"
                : "border-border-default bg-transparent"
          }`}
        >
          {verified ? (
            <Check
              className="text-success w-3 h-3 fade-up"
              strokeWidth={3}
            />
          ) : scanning ? (
            <Loader2 className="text-accent w-3 h-3 animate-spin" />
          ) : null}
        </span>
        <span
          className={`transition-colors duration-300 ${
            verified
              ? "text-text-primary"
              : scanning
                ? "text-accent"
                : "text-text-dim"
          }`}
        >
          {check.label}
        </span>
      </div>
      <div
        className="text-[10px] pl-6 transition-colors duration-300"
        style={{
          color: verified
            ? "var(--color-text-dim)"
            : scanning
              ? "var(--color-text-muted)"
              : "var(--color-text-dim)",
          fontVariantNumeric: "tabular-nums",
          letterSpacing: scanning ? "0.04em" : "normal",
        }}
      >
        {state === "idle" ? check.finalValue : displayValue}
      </div>
    </div>
  );
}

export function DeployPreview() {
  const [ref, inView] = useInView<HTMLDivElement>({ threshold: 0.3 });
  const [activeIndex, setActiveIndex] = useState(-1);
  const [verifiedCount, setVerifiedCount] = useState(0);
  const timersRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);

  useEffect(() => {
    if (!inView) return;

    const clearAll = () => {
      timersRef.current.forEach((t) => clearTimeout(t));
      timersRef.current = [];
    };

    if (prefersReducedMotion()) {
      const t = setTimeout(() => {
        setActiveIndex(-1);
        setVerifiedCount(CHECKS.length);
      }, 0);
      return () => {
        clearTimeout(t);
        clearAll();
      };
    }

    let cancelled = false;

    const run = () => {
      if (cancelled) return;
      setActiveIndex(-1);
      setVerifiedCount(0);

      const scanDuration = 900;
      const settleDelay = 250;

      CHECKS.forEach((_, i) => {
        const startScan = i * (scanDuration + settleDelay);
        timersRef.current.push(
          setTimeout(() => {
            if (cancelled) return;
            setActiveIndex(i);
          }, startScan),
        );
        timersRef.current.push(
          setTimeout(() => {
            if (cancelled) return;
            setVerifiedCount(i + 1);
            setActiveIndex(-1);
          }, startScan + scanDuration),
        );
      });

      const total =
        CHECKS.length * (scanDuration + settleDelay) + 2400;
      timersRef.current.push(setTimeout(run, total));
    };

    run();
    return () => {
      cancelled = true;
      clearAll();
    };
  }, [inView]);

  const allDone = verifiedCount === CHECKS.length;

  const rowStates: RowState[] = useMemo(
    () =>
      CHECKS.map((_, i) => {
        if (i < verifiedCount) return "verified";
        if (i === activeIndex) return "scanning";
        return "idle";
      }),
    [activeIndex, verifiedCount],
  );

  const scanning = activeIndex >= 0;
  const progressPct = (verifiedCount / CHECKS.length) * 100;

  return (
    <div ref={ref} className="h-full">
      <PreviewFrame label="verify">
        <div className="font-mono text-xs md:text-sm h-full flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <span className="text-text-dim text-[10px] uppercase tracking-widest">
              {"// pre-publication checks"}
            </span>
            <span
              className={`px-1.5 py-0.5 border text-[9px] uppercase tracking-wider transition-all duration-500 ${
                allDone
                  ? "border-accent/40 bg-accent/10 text-accent shadow-[0_0_12px_rgba(249,115,22,0.25)]"
                  : scanning
                    ? "border-accent/30 bg-accent/5 text-accent/80"
                    : "border-border-default text-text-dim"
              }`}
            >
              {allDone ? "ready" : scanning ? "scanning…" : "waiting"}
            </span>
          </div>

          <div className="h-px bg-bg-surface relative mb-4 overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 bg-accent transition-[width] duration-500 ease-out"
              style={{ width: `${progressPct}%` }}
            />
            {scanning && (
              <div
                className="absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-transparent via-accent/60 to-transparent"
                style={{
                  animation: "scanShimmer 1.6s linear infinite",
                  left: `${progressPct}%`,
                }}
              />
            )}
          </div>

          <div className="space-y-2.5">
            {CHECKS.map((c, i) => (
              <CheckRow
                key={c.label}
                check={c}
                state={rowStates[i] ?? "idle"}
                index={i}
              />
            ))}
          </div>

          <div className="pt-4 mt-auto border-t border-border-default flex items-center justify-between">
            <span className="text-text-dim text-[10px] uppercase tracking-widest">
              {"// trust"}
            </span>
            <span
              className={`text-[10px] transition-all duration-500 ${
                allDone ? "text-accent" : "text-text-dim"
              }`}
            >
              {allDone ? (
                <>
                  <span className="inline-block w-1.5 h-1.5 bg-success rounded-none mr-1.5 align-middle animate-pulse" />
                  one binary · every platform
                </>
              ) : (
                "verifying integrity…"
              )}
            </span>
          </div>
        </div>
      </PreviewFrame>
    </div>
  );
}
