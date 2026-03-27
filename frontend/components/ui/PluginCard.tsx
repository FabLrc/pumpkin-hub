import type { PluginSummary } from "@/lib/types";
import Link from "next/link";
import { Star } from "lucide-react";
import { Badge } from "./Badge";
import { PluginIcon } from "./PluginIcon";

interface PluginCardProps {
  readonly plugin: PluginSummary;
  readonly featured?: boolean;
}

export function formatDownloads(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(0).replace(/\.0$/, "")}k`;
  return String(count);
}

export function formatTimeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "just now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function PluginCard({ plugin, featured = false }: PluginCardProps) {
  const cardClasses = featured
    ? "plugin-card featured border border-accent/30 bg-bg-elevated/50"
    : "plugin-card border border-border-default bg-bg-elevated/30";

  return (
    <div className={`${cardClasses} p-5 flex items-start gap-5 cursor-pointer relative`}>
        <div className="mt-0.5">
          <PluginIcon
            pluginName={plugin.name}
            iconUrl={plugin.icon_url}
            featured={featured}
            sizeClassName="w-11 h-11"
          />
        </div>

        {/* Main info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4 mb-1.5">
            <div className="flex items-center gap-3">
              {/* Stretched link: covers the entire card via ::after overlay */}
              <Link
                href={`/plugins/${plugin.slug}`}
                className="font-raleway font-bold text-base text-text-primary hover:text-accent transition-colors after:absolute after:inset-0"
              >
                {plugin.name}
              </Link>
              {featured && <Badge variant="orange">FEATURED</Badge>}
            </div>
          </div>

          <p className="font-mono text-[10px] text-text-dim mb-2.5">
            by{" "}
            <Link
              href={`/users/${plugin.author.username}`}
              className="relative z-10 text-text-subtle hover:text-accent transition-colors"
            >
              {plugin.author.username}
            </Link>
            {" · "}
            Updated {formatTimeAgo(plugin.updated_at)}
          </p>

          {plugin.short_description && (
            <p className="font-raleway text-sm text-text-subtle leading-relaxed mb-3 max-w-2xl">
              {plugin.short_description}
            </p>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            {plugin.categories.map((category) => (
              <span
                key={category.id}
                className="font-mono text-[10px] border border-border-default text-text-dim px-2 py-0.5"
              >
                #{category.slug}
              </span>
            ))}
            {plugin.license && (
              <span className="font-mono text-[10px] border border-border-default text-text-dim px-2 py-0.5">
                {plugin.license}
              </span>
            )}
          </div>
        </div>

        {/* Stats column */}
        <div className="flex-shrink-0 text-right space-y-1 min-w-[100px]">
          <div className="font-mono text-sm font-bold text-text-primary">
            {formatDownloads(plugin.downloads_total)}
          </div>
          <div className="font-mono text-[10px] text-text-dim">downloads</div>
          <div className="flex items-center justify-end gap-1 mt-2">
            <Star className="w-[11px] h-[11px] text-accent fill-accent" />
            <span className="font-mono text-xs text-text-subtle">
              {plugin.review_count > 0
                ? `${plugin.average_rating.toFixed(1)} (${plugin.review_count})`
                : "—"}
            </span>
          </div>
        </div>
    </div>
  );
}
