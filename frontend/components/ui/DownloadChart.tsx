"use client";

import type { DownloadDataPoint, DownloadGranularity } from "@/lib/types";

interface DownloadChartProps {
  data: DownloadDataPoint[];
  granularity: DownloadGranularity;
  height?: number;
}

function getChartHeightClass(height: number): string {
  if (height <= 128) return "h-32";
  if (height <= 160) return "h-40";
  if (height <= 192) return "h-48";
  return "h-56";
}

function formatPeriodLabel(period: string, granularity: DownloadGranularity): string {
  if (granularity === "daily") {
    // "2026-03-10" → "Mar 10"
    const date = new Date(period);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
  if (granularity === "monthly") {
    // "2026-03" → "Mar"
    const [year, month] = period.split("-");
    const date = new Date(Number(year), Number(month) - 1);
    return date.toLocaleDateString("en-US", { month: "short" });
  }
  // Weekly: "2026-W10" → "W10"
  return period.replace(/^\d{4}-/, "");
}

function formatDownloads(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}k`;
  return String(count);
}

export function DownloadChart({
  data,
  granularity,
  height = 160,
}: DownloadChartProps) {
  const maxDownloads = Math.max(...data.map((d) => d.downloads), 1);
  const chartHeightClass = getChartHeightClass(height);

  return (
    <div className="w-full">
      {/* Y-axis labels + bars */}
      <div className={`flex items-end gap-1 ${chartHeightClass}`}>
        {data.map((point) => {
          const barHeight =
            maxDownloads > 0 ? (point.downloads / maxDownloads) * 100 : 0;
          const normalizedHeight = Math.max(barHeight, 1);
          return (
            <div
              key={point.period}
              className="flex-1 flex flex-col items-center justify-end group relative"
            >
              {/* Tooltip on hover */}
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                <div className="bg-bg-deep border border-border-hover px-2 py-1 whitespace-nowrap">
                  <span className="font-mono text-[10px] text-accent font-bold">
                    {formatDownloads(point.downloads)}
                  </span>
                </div>
              </div>
              {/* Bar */}
              <svg
                className="w-full h-full"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <rect
                  x="0"
                  y={100 - normalizedHeight}
                  width="100"
                  height={normalizedHeight}
                  className="fill-accent/80 group-hover:fill-accent transition-colors"
                />
              </svg>
            </div>
          );
        })}
      </div>
      {/* X-axis labels */}
      <div className="flex gap-1 mt-1.5">
        {data.map((point, i) => {
          // Show every label if < 10 items, otherwise every other
          const showLabel = data.length <= 10 || i % 2 === 0;
          return (
            <div key={point.period} className="flex-1 text-center">
              {showLabel && (
                <span className="font-mono text-[8px] text-text-dim leading-none">
                  {formatPeriodLabel(point.period, granularity)}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface GranularitySelectorProps {
  value: DownloadGranularity;
  onChange: (value: DownloadGranularity) => void;
}

const GRANULARITY_OPTIONS: { value: DownloadGranularity; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

export function GranularitySelector({
  value,
  onChange,
}: GranularitySelectorProps) {
  return (
    <div className="flex gap-0.5">
      {GRANULARITY_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider transition-colors cursor-pointer ${
            value === option.value
              ? "bg-accent text-black font-bold"
              : "bg-bg-surface text-text-dim hover:text-text-primary border border-border-default"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
