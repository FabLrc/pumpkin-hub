"use client";

import Link from "next/link";
import { Star } from "lucide-react";
import { Badge } from "@/components/ui";
import type { SearchHit } from "@/lib/types";
import { formatDownloads, formatTimeAgo } from "@/components/ui/PluginCard";

interface SearchHitCardProps {
  hit: SearchHit;
  featured?: boolean;
}

export function SearchHitCard({ hit, featured = false }: SearchHitCardProps) {
  const updatedAt = new Date(hit.updated_at_timestamp * 1000).toISOString();

  const cardClasses = featured
    ? "plugin-card featured border border-accent/30 bg-bg-elevated/50"
    : "plugin-card border border-border-default bg-bg-elevated/30";

  return (
    <Link href={`/plugins/${hit.slug}`} className="block">
      <div
        className={`${cardClasses} p-5 flex items-start gap-5 cursor-pointer`}
      >
        {/* Icon placeholder */}
        <div
          className={`w-11 h-11 flex items-center justify-center flex-shrink-0 mt-0.5 ${
            featured
              ? "bg-accent/10 border border-accent/30"
              : "bg-bg-surface border border-border-hover"
          }`}
        >
          <span
            className={`font-mono font-bold text-xs ${
              featured ? "text-accent" : "text-text-subtle"
            }`}
          >
            {hit.name.slice(0, 2).toUpperCase()}
          </span>
        </div>

        {/* Main info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4 mb-1.5">
            <div className="flex items-center gap-3">
              <span className="font-raleway font-bold text-base text-text-primary hover:text-accent transition-colors">
                {hit.name}
              </span>
              {featured && <Badge variant="orange">FEATURED</Badge>}
            </div>
          </div>

          <p className="font-mono text-[10px] text-text-dim mb-2.5">
            by{" "}
            <span className="text-text-subtle">{hit.author_username}</span>
            {" · "}
            Updated {formatTimeAgo(updatedAt)}
          </p>

          {hit.short_description && (
            <p className="font-raleway text-sm text-text-subtle leading-relaxed mb-3 max-w-2xl">
              {hit.short_description}
            </p>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            {hit.category_slugs.map((slug) => (
              <span
                key={slug}
                className="font-mono text-[10px] border border-border-default text-text-dim px-2 py-0.5"
              >
                #{slug}
              </span>
            ))}
            {hit.platforms.map((platform) => (
              <span
                key={platform}
                className="font-mono text-[10px] border border-accent/20 text-accent/70 px-2 py-0.5 capitalize"
              >
                {platform}
              </span>
            ))}
            {hit.license && (
              <span className="font-mono text-[10px] border border-border-default text-text-dim px-2 py-0.5">
                {hit.license}
              </span>
            )}
          </div>
        </div>

        {/* Stats column */}
        <div className="flex-shrink-0 text-right space-y-1 min-w-[100px]">
          <div className="font-mono text-sm font-bold text-text-primary">
            {formatDownloads(hit.downloads_total)}
          </div>
          <div className="font-mono text-[10px] text-text-dim">downloads</div>
          <div className="flex items-center justify-end gap-1 mt-2">
            <Star className="w-[11px] h-[11px] text-accent fill-accent" />
            <span className="font-mono text-xs text-text-subtle">
              {hit.review_count > 0
                ? `${hit.average_rating.toFixed(1)} (${hit.review_count})`
                : "—"}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
