import type { PluginSummary } from "@/lib/types";
import Link from "next/link";
import { Star } from "lucide-react";
import { Badge } from "./Badge";
import { PluginIcon } from "./PluginIcon";
import { formatDownloads, formatTimeAgo } from "@/lib/formatters";

interface PluginCardProps {
  readonly plugin: PluginSummary;
  readonly featured?: boolean;
}

export { formatDownloads, formatTimeAgo };

const NEW_THRESHOLD_MS = 14 * 24 * 60 * 60 * 1000;

export function isNewPlugin(createdAt: string): boolean {
  return Date.now() - new Date(createdAt).getTime() < NEW_THRESHOLD_MS;
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
            <div className="flex items-center gap-3 flex-wrap">
              {/* Stretched link: covers the entire card via ::after overlay */}
              <Link
                href={`/plugins/${plugin.slug}`}
                className="font-raleway font-bold text-base text-text-primary hover:text-accent transition-colors after:absolute after:inset-0"
              >
                {plugin.name}
              </Link>
              {featured && <Badge variant="orange">FEATURED</Badge>}
              {!featured && isNewPlugin(plugin.created_at) && (
                <span className="font-mono text-[9px] font-bold uppercase bg-white text-black px-1.5 py-0.5 leading-none">
                  NEW
                </span>
              )}
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
