"use client";

import { useEffect, useRef, useState } from "react";
import { Package, GitBranch, FileCode } from "lucide-react";
import { TerminalPreview } from "./TerminalPreview";
import { GithubWorkflowPreview } from "./GithubWorkflowPreview";
import { DeployPreview } from "./DeployPreview";

const STEPS = [
  {
    icon: Package,
    eyebrow: "// discover",
    title: "Server Builder",
    description:
      "Configure a ready-to-launch server stack in minutes. Pick plugins, resolve dependencies automatically, download a portable .zip with Pumpkin and all .wasm files. Share builds via tokenized links.",
  },
  {
    icon: GitBranch,
    eyebrow: "// publish",
    title: "GitHub Auto-Publishing",
    description:
      "Publish a plugin from a GitHub repository in two clicks. Every GitHub Release creates a new version automatically. README and changelog stay in sync. Dynamic badge for your repository.",
  },
  {
    icon: FileCode,
    eyebrow: "// trust",
    title: "WASM Everywhere",
    description:
      "A single .wasm binary runs on Windows, macOS, and Linux. No more platform-specific builds. Every binary is SHA-256 hashed and automatically scanned for vulnerabilities before publication.",
  },
];

function StepPreview({ index, active }: { index: number; active: boolean }) {
  if (index === 0) return <TerminalPreview active={active} />;
  if (index === 1) return <GithubWorkflowPreview active={active} />;
  return <DeployPreview />;
}

export function WorkflowSection() {
  const [active, setActive] = useState(0);
  const stepRefs = useRef<Array<HTMLDivElement | null>>([]);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) {
          const idx = Number(
            (visible.target as HTMLElement).dataset.stepIndex ?? 0,
          );
          setActive(idx);
        }
      },
      {
        rootMargin: "-35% 0px -35% 0px",
        threshold: [0, 0.25, 0.5, 0.75, 1],
      },
    );

    stepRefs.current.forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <section
      aria-labelledby="workflow-heading"
      className="border-t border-border-default bg-bg-elevated/30"
    >
      <div className="max-w-7xl mx-auto px-6 py-24 md:py-32">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-px w-8 bg-accent" />
          <span className="font-mono text-xs text-accent tracking-widest uppercase">
            {"// 02 — the workflow"}
          </span>
        </div>

        <div className="mb-16 md:mb-20 max-w-3xl">
          <h2
            id="workflow-heading"
            className="font-raleway font-black text-3xl md:text-5xl text-text-primary mb-4"
          >
            Built for Server Admins
          </h2>
          <p className="font-raleway text-sm md:text-base text-text-dim">
            Discover, publish, and trust plugins — the entire lifecycle of a
            Pumpkin server, in one registry.
          </p>
        </div>

        {/* Mobile: linear stack */}
        <div className="md:hidden space-y-12">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <div key={step.title} className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[10px] text-accent tracking-widest uppercase">
                    {step.eyebrow}
                  </span>
                  <div className="flex-1 border-t border-border-default" />
                  <span className="font-mono text-xs text-text-dim/60 font-bold">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>
                <div className="flex items-start gap-4">
                  <div className="shrink-0 w-10 h-10 bg-bg-elevated border border-border-default flex items-center justify-center">
                    <Icon className="text-accent w-[18px] h-[18px]" />
                  </div>
                  <div>
                    <h3 className="font-raleway font-black text-xl text-text-primary mb-2">
                      {step.title}
                    </h3>
                    <p className="font-raleway text-sm text-text-dim leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
                <div className="h-[320px] mt-4">
                  <StepPreview index={i} active />
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop: sticky two-column */}
        <div className="hidden md:grid grid-cols-12 gap-12">
          <div className="col-span-5 space-y-12">
            {STEPS.map((step, i) => {
              const Icon = step.icon;
              const isActive = active === i;
              return (
                <div
                  key={step.title}
                  ref={(el) => {
                    stepRefs.current[i] = el;
                  }}
                  data-step-index={i}
                  className={`min-h-[60vh] border-l-2 pl-8 py-12 transition-colors duration-300 ${
                    isActive ? "border-accent" : "border-border-default"
                  }`}
                >
                  <div className="flex items-baseline gap-4 mb-6">
                    <span
                      className={`font-mono font-black text-5xl tracking-tighter transition-colors duration-300 ${
                        isActive ? "text-accent" : "text-text-dim/30"
                      }`}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span
                      className={`font-mono text-[11px] tracking-widest uppercase transition-colors duration-300 ${
                        isActive ? "text-accent" : "text-text-dim"
                      }`}
                    >
                      {step.eyebrow}
                    </span>
                  </div>

                  <div className="flex items-start gap-4 mb-4">
                    <div
                      className={`shrink-0 w-10 h-10 bg-bg-elevated border flex items-center justify-center transition-colors duration-300 ${
                        isActive ? "border-accent/60" : "border-border-default"
                      }`}
                    >
                      <Icon className="text-accent w-[18px] h-[18px]" />
                    </div>
                    <h3
                      className={`font-raleway font-black text-2xl leading-tight transition-colors duration-300 ${
                        isActive ? "text-text-primary" : "text-text-muted"
                      }`}
                    >
                      {step.title}
                    </h3>
                  </div>

                  <p
                    className={`font-raleway text-sm leading-relaxed transition-colors duration-300 ${
                      isActive ? "text-text-muted" : "text-text-dim"
                    }`}
                  >
                    {step.description}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="col-span-7">
            <div className="sticky top-24 h-[70vh] min-h-[560px]">
              <div key={active} className="h-full fade-up">
                <StepPreview index={active} active />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
