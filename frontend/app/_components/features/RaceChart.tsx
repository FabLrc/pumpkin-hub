"use client";

import { useEffect, useState } from "react";
import { prefersReducedMotion, useInView } from "./useInView";

export interface RaceLane {
  label: string;
  display: string;
  raw: number;
  best?: boolean;
}

export interface RaceMetric {
  metric: string;
  unit: string;
  lanes: RaceLane[];
}

interface RaceChartProps {
  metrics: RaceMetric[];
}

function RaceMetricBlock({ metric }: { metric: RaceMetric }) {
  const [ref, inView] = useInView<HTMLDivElement>({ threshold: 0.4 });
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    if (!inView) return;
    const delay = prefersReducedMotion() ? 0 : 80;
    const t = setTimeout(() => setAnimate(true), delay);
    return () => clearTimeout(t);
  }, [inView]);

  const maxRaw = Math.max(...metric.lanes.map((l) => l.raw));

  return (
    <div
      ref={ref}
      className="border border-border-default bg-bg-base/40 p-6 md:p-8"
    >
      <div className="flex items-baseline justify-between mb-6">
        <div className="font-raleway font-black text-lg text-text-primary">
          {metric.metric}
        </div>
        <div className="font-mono text-[10px] text-text-dim tracking-widest uppercase">
          {"// lower is better"}
        </div>
      </div>

      <div className="space-y-4">
        {metric.lanes.map((lane, i) => {
          const ratio = maxRaw === 0 ? 0 : (lane.raw / maxRaw) * 100;
          const targetWidth = Math.max(ratio, 4);

          return (
            <div key={lane.label}>
              <div className="flex items-center justify-between mb-1.5">
                <span
                  className={`font-mono text-xs font-bold uppercase tracking-wider ${
                    lane.best ? "text-accent" : "text-text-muted"
                  }`}
                >
                  {lane.label}
                </span>
                <span className="flex items-center gap-2">
                  <span
                    className={`font-mono text-xs font-bold ${
                      lane.best ? "text-accent" : "text-text-dim"
                    }`}
                  >
                    {lane.display}
                  </span>
                  {lane.best && (
                    <span className="px-1.5 py-0.5 bg-accent/10 border border-accent/30 font-mono text-[9px] text-accent uppercase tracking-wider leading-none">
                      best
                    </span>
                  )}
                </span>
              </div>
              <div className="h-3 bg-bg-surface border border-border-default relative overflow-hidden">
                <div
                  className={
                    lane.best
                      ? "h-full bg-accent"
                      : "h-full bg-border-hover"
                  }
                  style={{
                    width: animate ? `${targetWidth}%` : "0%",
                    transition: `width 800ms cubic-bezier(0.16, 1, 0.3, 1) ${
                      i * 120
                    }ms`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function RaceChart({ metrics }: RaceChartProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {metrics.map((m) => (
        <RaceMetricBlock key={m.metric} metric={m} />
      ))}
    </div>
  );
}
