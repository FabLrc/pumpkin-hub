"use client";

import type { RatingDistribution } from "@/lib/types";
import { StarRating } from "./StarRating";

interface RatingOverviewProps {
  readonly averageRating: number;
  readonly total: number;
  readonly distribution: RatingDistribution;
}

export function RatingOverview({
  averageRating,
  total,
  distribution,
}: RatingOverviewProps) {
  const bars = [
    { label: "5", count: distribution.star_5 },
    { label: "4", count: distribution.star_4 },
    { label: "3", count: distribution.star_3 },
    { label: "2", count: distribution.star_2 },
    { label: "1", count: distribution.star_1 },
  ];

  const maxCount = Math.max(...bars.map((b) => b.count), 1);

  return (
    <div className="flex items-start gap-8">
      {/* Left: big average number */}
      <div className="text-center space-y-1 flex-shrink-0">
        <div className="font-mono text-4xl font-bold text-text-primary">
          {total > 0 ? averageRating.toFixed(1) : "—"}
        </div>
        <StarRating
          value={Math.round(averageRating)}
          readonly
          size="sm"
        />
        <div className="font-mono text-[10px] text-text-dim">
          {total} review{total !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Right: distribution bars */}
      <div className="flex-1 space-y-1.5">
        {bars.map((bar) => (
          <div key={bar.label} className="flex items-center gap-2">
            <span className="font-mono text-[10px] text-text-dim w-3 text-right">
              {bar.label}
            </span>
            <progress
              className="flex-1 h-2"
              value={bar.count}
              max={maxCount}
              aria-label={`${bar.label} star reviews`}
            />
            <span className="font-mono text-[10px] text-text-dim w-6 text-right">
              {bar.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
