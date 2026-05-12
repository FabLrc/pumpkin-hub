"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Github, Laptop, Loader2, Package } from "lucide-react";
import { PreviewFrame } from "./PreviewFrame";
import { prefersReducedMotion, useInView } from "./useInView";

type Stage =
  | "idle"
  | "coding"
  | "pushing"
  | "ci-lint"
  | "ci-build"
  | "ci-test"
  | "ci-sign"
  | "deploying"
  | "published"
  | "rest";

const SEQUENCE: Array<{ stage: Stage; delay: number }> = [
  { stage: "idle", delay: 800 },
  { stage: "coding", delay: 2000 },
  { stage: "pushing", delay: 1900 },
  { stage: "ci-lint", delay: 800 },
  { stage: "ci-build", delay: 900 },
  { stage: "ci-test", delay: 1000 },
  { stage: "ci-sign", delay: 800 },
  { stage: "deploying", delay: 1200 },
  { stage: "published", delay: 1400 },
  { stage: "rest", delay: 2200 },
];

const CODE_LINES = [
  "pub fn on_block_break(",
  "    ctx: &EventCtx,",
  ") -> Result<()> {",
  "    ctx.particle(Spark)",
  "}",
];

const CI_STEPS: Array<{ key: Stage; label: string }> = [
  { key: "ci-lint", label: "cargo clippy" },
  { key: "ci-build", label: "cargo build --release" },
  { key: "ci-test", label: "cargo test" },
  { key: "ci-sign", label: "sha256 + sign" },
];

function isAfter(current: Stage, target: Stage): boolean {
  const order: Stage[] = [
    "idle",
    "coding",
    "pushing",
    "ci-lint",
    "ci-build",
    "ci-test",
    "ci-sign",
    "deploying",
    "published",
    "rest",
  ];
  return order.indexOf(current) > order.indexOf(target);
}

function isAtOrAfter(current: Stage, target: Stage): boolean {
  return current === target || isAfter(current, target);
}

interface PipeProps {
  active: boolean;
  done: boolean;
}

function Pipe({ active, done }: PipeProps) {
  return (
    <div className="relative flex justify-center py-1">
      <div className="relative w-px h-5 bg-border-default">
        <div
          className="absolute inset-x-0 top-0 bg-accent transition-[height] duration-1000 ease-out"
          style={{ height: done ? "100%" : active ? "100%" : "0%" }}
        />
        {active && (
          <div
            className="absolute left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-accent shadow-[0_0_8px_rgba(249,115,22,0.8)]"
            style={{
              animation: "pipeDot 1.1s cubic-bezier(0.45, 0, 0.55, 1) forwards",
            }}
          />
        )}
      </div>
    </div>
  );
}

export function GithubWorkflowPreview({ active }: { active: boolean }) {
  const [ref, inView] = useInView<HTMLDivElement>({ threshold: 0.3 });
  const [stage, setStage] = useState<Stage>("idle");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!active || !inView) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setStage("idle");
      return;
    }

    if (prefersReducedMotion()) {
      setStage("published");
      return;
    }

    let cancelled = false;
    let i = 0;

    const tick = () => {
      if (cancelled) return;
      const step = SEQUENCE[i % SEQUENCE.length];
      if (!step) return;
      setStage(step.stage);
      timeoutRef.current = setTimeout(() => {
        i++;
        tick();
      }, step.delay);
    };

    tick();

    return () => {
      cancelled = true;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [active, inView]);

  const codingActive = stage === "coding";
  const pushActive = stage === "pushing";
  const pushDone = isAtOrAfter(stage, "pushing") && stage !== "idle";
  const ciStages: Stage[] = ["ci-lint", "ci-build", "ci-test", "ci-sign"];
  const ciActive = ciStages.includes(stage);
  const deployActive = stage === "deploying";
  const published = stage === "published" || stage === "rest";

  return (
    <div ref={ref} className="h-full">
      <PreviewFrame label="workflow">
        <div
          className="font-mono text-[11px] md:text-xs h-full flex flex-col"
          aria-label="GitHub auto-publish workflow animation"
        >
          {/* Station 1 — Dev */}
          <div
            className={`border border-border-default bg-bg-elevated/60 p-2.5 transition-colors duration-300 ${
              codingActive || pushActive
                ? "border-accent/60"
                : "border-border-default"
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <Laptop
                  className={`w-3.5 h-3.5 transition-colors ${
                    codingActive || pushActive ? "text-accent" : "text-text-muted"
                  }`}
                />
                <span className="text-text-primary text-[10px] uppercase tracking-widest">
                  developer
                </span>
              </div>
              <span className="text-text-dim text-[9px] uppercase tracking-wider">
                {pushActive
                  ? "pushing…"
                  : codingActive
                    ? "editing"
                    : pushDone
                      ? "synced"
                      : "idle"}
              </span>
            </div>

            {/* Editor */}
            <div className="bg-bg-base border border-border-default px-2.5 py-1.5 min-h-[66px]">
              <div className="space-y-0.5">
                {CODE_LINES.map((line, i) => {
                  const codeVisible = isAtOrAfter(stage, "coding");
                  return (
                    <div
                      key={line}
                      className="text-[10px] leading-tight transition-opacity"
                      style={{
                        opacity: codeVisible ? 1 : 0,
                        transitionDuration: codeVisible ? "300ms" : "500ms",
                        transitionDelay: codingActive
                          ? `${i * 220}ms`
                          : "0ms",
                        color:
                          i === 0 || i === 2
                            ? "var(--color-accent)"
                            : "var(--color-text-muted)",
                      }}
                    >
                      {line}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Git terminal */}
            <div
              className="overflow-hidden transition-[max-height,opacity,margin-top] ease-out"
              style={{
                maxHeight: pushDone ? 78 : 0,
                opacity: pushDone ? 1 : 0,
                marginTop: pushDone ? 6 : 0,
                transitionDuration: pushDone ? "500ms" : "400ms",
              }}
              aria-hidden={!pushDone}
            >
              <div className="bg-bg-base border border-border-default px-2.5 py-1.5 space-y-1">
                <div className="text-text-secondary text-[10px]">
                  <span className="text-accent">$</span> git commit -m{" "}
                  <span className="text-text-muted">
                    &quot;feat: spark on break&quot;
                  </span>
                </div>
                <div className="text-text-secondary text-[10px]">
                  <span className="text-accent">$</span> git push origin{" "}
                  <span className="text-text-muted">main</span>
                  {pushActive && (
                    <span className="inline-block w-1.5 h-2.5 bg-accent ml-1 align-middle animate-pulse" />
                  )}
                </div>
                <div className="text-success text-[10px]">
                  → tag v1.2.0 created
                </div>
              </div>
            </div>
          </div>

          <Pipe
            active={pushActive}
            done={isAtOrAfter(stage, "ci-lint") && !pushActive}
          />

          {/* Station 2 — GitHub Actions */}
          <div
            className={`border bg-bg-elevated/60 p-2.5 transition-colors duration-300 ${
              ciActive ? "border-accent/60" : "border-border-default"
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <Github
                  className={`w-3.5 h-3.5 transition-colors ${
                    ciActive || isAfter(stage, "ci-sign")
                      ? "text-accent"
                      : "text-text-muted"
                  }`}
                />
                <span className="text-text-primary text-[10px] uppercase tracking-widest">
                  github actions
                </span>
              </div>
              <span className="text-text-dim text-[9px] uppercase tracking-wider">
                {ciActive
                  ? "running"
                  : isAfter(stage, "ci-sign")
                    ? "passed"
                    : "queued"}
              </span>
            </div>

            <div className="space-y-0.5">
              {CI_STEPS.map((step) => {
                const reached = isAtOrAfter(stage, step.key);
                const done = isAfter(stage, step.key);
                const running = stage === step.key;
                return (
                  <div
                    key={step.key}
                    className={`flex items-center justify-between px-2 py-0.5 border transition-all duration-300 ${
                      reached
                        ? "border-border-default bg-bg-base/80 opacity-100"
                        : "border-border-default/40 bg-bg-base/30 opacity-40"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-3 h-3 border flex items-center justify-center transition-colors ${
                          done
                            ? "border-success/50 bg-success/15"
                            : running
                              ? "border-accent/60 bg-accent/15"
                              : "border-border-default bg-transparent"
                        }`}
                      >
                        {done ? (
                          <Check
                            className="text-success w-2 h-2"
                            strokeWidth={4}
                          />
                        ) : running ? (
                          <Loader2 className="text-accent w-2 h-2 animate-spin" />
                        ) : null}
                      </span>
                      <span
                        className={`text-[10px] ${
                          done
                            ? "text-text-primary"
                            : running
                              ? "text-accent"
                              : "text-text-dim"
                        }`}
                      >
                        {step.label}
                      </span>
                    </div>
                    {done && (
                      <span className="text-text-dim text-[9px]">ok</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <Pipe active={deployActive} done={published} />

          {/* Station 3 — Pumpkin Hub */}
          <div
            className={`border bg-bg-elevated/60 p-2.5 transition-colors duration-300 ${
              deployActive || published
                ? "border-accent/60"
                : "border-border-default"
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <Package
                  className={`w-3.5 h-3.5 transition-colors ${
                    deployActive || published ? "text-accent" : "text-text-muted"
                  }`}
                />
                <span className="text-text-primary text-[10px] uppercase tracking-widest">
                  pumpkin hub
                </span>
              </div>
              <span className="text-text-dim text-[9px] uppercase tracking-wider">
                {published ? "published" : deployActive ? "deploying…" : "waiting"}
              </span>
            </div>

            <div
              className={`border px-3 py-2 transition-all duration-500 ${
                published
                  ? "border-accent/40 bg-accent/[0.04] opacity-100 translate-y-0"
                  : deployActive
                    ? "border-border-default bg-bg-base/60 opacity-70 translate-y-0"
                    : "border-border-default/40 bg-bg-base/30 opacity-30 translate-y-1"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-text-primary text-[11px]">
                  spark-on-break
                </span>
                <span
                  className={`px-1.5 py-0.5 border text-[8px] uppercase tracking-wider transition-all ${
                    published
                      ? "border-accent/40 bg-accent/10 text-accent"
                      : "border-border-default text-text-dim"
                  }`}
                >
                  v1.2.0
                </span>
              </div>
              <div className="text-text-dim text-[9px] tracking-wider">
                sha256 a3f1…c9e2 · 1 binary · win · macos · linux
              </div>
              <div
                className={`mt-1.5 flex items-center justify-between text-[9px] transition-opacity duration-500 ${
                  published ? "opacity-100" : "opacity-0"
                }`}
              >
                <span className="text-success">
                  ↑ live on pumpkinhub.dev
                </span>
                <span className="text-text-muted">+42 dl / min</span>
              </div>
            </div>
          </div>
        </div>
      </PreviewFrame>
    </div>
  );
}
