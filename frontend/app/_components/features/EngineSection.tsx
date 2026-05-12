import { HardDrive, Cpu, Users } from "lucide-react";
import { AnimatedCounter } from "./AnimatedCounter";
import { RaceChart, type RaceMetric } from "./RaceChart";

const SECONDARY_STATS = [
  {
    icon: HardDrive,
    value: "~100MB",
    label: "Memory footprint",
    desc: "vs 1.8GB Vanilla",
  },
  {
    icon: Cpu,
    value: "All Cores",
    label: "Multi-threaded engine",
    desc: "Rust async runtime",
  },
  {
    icon: Users,
    value: "Java + Bedrock",
    label: "Cross-play built-in",
    desc: "No plugin required",
  },
];

const RACE_METRICS: RaceMetric[] = [
  {
    metric: "Startup time",
    unit: "ms",
    lanes: [
      { label: "Pumpkin", display: "~5ms", raw: 5, best: true },
      { label: "Paper", display: "~10s", raw: 10000 },
      { label: "Vanilla", display: "~15s", raw: 15000 },
    ],
  },
  {
    metric: "RAM usage",
    unit: "MB",
    lanes: [
      { label: "Pumpkin", display: "~100MB", raw: 100, best: true },
      { label: "Paper", display: "~1.4GB", raw: 1400 },
      { label: "Vanilla", display: "~1.8GB", raw: 1800 },
    ],
  },
];

export function EngineSection() {
  return (
    <section
      aria-labelledby="engine-heading"
      className="relative border-t border-border-default overflow-hidden"
    >
      <div className="absolute inset-0 grid-bg opacity-60 pointer-events-none" />
      <div className="absolute inset-0 scanline pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-20 md:py-24 lg:py-32">
        <div className="flex items-center gap-3 mb-8 sm:mb-12">
          <div className="h-px w-8 bg-accent" />
          <span className="font-mono text-xs text-accent tracking-widest uppercase">
            {"// 01 — the engine"}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 lg:gap-12 mb-12 md:mb-16 lg:mb-20">
          {/* Stat hero */}
          <div className="lg:col-span-7 border border-border-default p-6 sm:p-8 md:p-10 lg:p-12 bg-bg-elevated/40 relative">
            <span className="absolute top-3 right-4 sm:top-4 sm:right-5 font-mono text-[10px] text-text-dim/60 tracking-widest uppercase">
              {"// startup time"}
            </span>
            <div className="font-raleway font-black text-accent leading-[0.85] text-[clamp(3.5rem,16vw,9rem)] mb-3 sm:mb-4">
              <AnimatedCounter target={5} suffix="ms" />
            </div>
            <h2
              id="engine-heading"
              className="font-raleway font-black text-2xl text-text-primary mb-2"
            >
              Powered by Pumpkin
            </h2>
            <p className="font-raleway text-sm text-text-dim max-w-md">
              Pumpkin Hub is built on{" "}
              <span className="text-text-muted">Pumpkin MC</span> — the world&apos;s
              fastest Minecraft server engine, written in pure Rust.{" "}
              <span className="text-accent">1000× faster</span> than Vanilla.
            </p>
          </div>

          {/* Stats stack */}
          <div className="lg:col-span-5 border border-border-default bg-bg-elevated/40">
            {SECONDARY_STATS.map((s, i) => {
              const Icon = s.icon;
              const isLast = i === SECONDARY_STATS.length - 1;
              return (
                <div
                  key={s.label}
                  className={`p-6 md:p-7 flex items-start gap-4 transition-[border-color] duration-200 hover:border-accent/40 ${
                    isLast ? "" : "border-b border-border-default"
                  }`}
                >
                  <div className="shrink-0 w-10 h-10 bg-bg-deep border border-border-default flex items-center justify-center">
                    <Icon className="text-accent w-[18px] h-[18px]" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-raleway font-black text-xl text-text-primary mb-0.5 break-words">
                      {s.value}
                    </div>
                    <div className="font-raleway text-sm text-text-muted">
                      {s.label}
                    </div>
                    <div className="font-mono text-[10px] text-text-dim tracking-wider uppercase mt-1">
                      {s.desc}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Race chart */}
        <div>
          <div className="flex items-center gap-3 mb-6">
            <span className="font-mono text-[10px] text-text-dim tracking-widest uppercase">
              {"// benchmarks · pumpkin vs paper vs vanilla"}
            </span>
            <div className="flex-1 border-t border-border-default" />
          </div>
          <RaceChart metrics={RACE_METRICS} />
        </div>
      </div>
    </section>
  );
}
