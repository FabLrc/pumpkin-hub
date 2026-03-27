import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { PluginSummary } from "@/lib/types";
import { PluginIcon } from "@/components/ui";

interface TrendingSectionProps {
  readonly plugins: PluginSummary[];
}

function formatDownloads(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000)
    return `${(count / 1_000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(count);
}

export function TrendingSection({ plugins }: TrendingSectionProps) {
  const featured = plugins[0];
  const rest = plugins.slice(1, 5);

  return (
    <section className="border-t border-border-default">
      <div className="max-w-7xl mx-auto px-6 py-20">
        {/* Section header */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-px w-8 bg-accent" />
              <span className="font-mono text-xs text-accent tracking-widest uppercase">
                Trending this week
              </span>
            </div>
            <h2 className="font-raleway font-black text-3xl text-text-primary">
              Hot Plugins
            </h2>
          </div>
          <Link
            href="/explorer"
            className="font-mono text-xs text-text-subtle hover:text-accent transition-colors flex items-center gap-2"
          >
            View all <ArrowRight className="w-[14px] h-[14px]" />
          </Link>
        </div>

        {/* Bento Grid — featured (5 cols × 2 rows) + 2×2 small cards (7 cols × 2 rows) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 lg:grid-rows-2 gap-4 lg:min-h-[520px]">
          {/* Featured card */}
          {featured ? (
            <Link
              href={`/plugins/${featured.slug}`}
              className="bento-card col-span-1 lg:col-span-5 lg:row-span-2 border border-border-default bg-bg-elevated p-6 flex flex-col relative overflow-hidden group cursor-pointer"
            >
              <div className="absolute top-0 right-0 w-40 h-40 bg-accent/5 -translate-y-1/2 translate-x-1/2 pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-accent/5 translate-y-1/2 -translate-x-1/2 pointer-events-none" />

              <div className="flex items-start justify-between mb-6">
                <PluginIcon
                  pluginName={featured.name}
                  iconUrl={featured.icon_url}
                  featured
                  sizeClassName="w-12 h-12"
                />
                <span className="font-mono text-[10px] bg-accent/10 text-accent border border-accent/30 px-2 py-0.5 uppercase tracking-widest">
                  #1 Trending
                </span>
              </div>

              <h3 className="font-raleway font-black text-2xl text-text-primary mb-2">
                {featured.name}
              </h3>
              <p className="font-mono text-xs text-text-dim mb-1">
                by <span className="text-text-subtle">{featured.author.username}</span>
              </p>
              {featured.short_description && (
                <p className="font-raleway text-sm text-text-subtle leading-relaxed mt-4 mb-auto">
                  {featured.short_description}
                </p>
              )}

              <div className="mt-6 pt-6 border-t border-border-default space-y-3">
                <div className="flex flex-wrap gap-2">
                  {featured.categories.map((cat) => (
                    <span
                      key={cat.id}
                      className="font-mono text-[10px] border border-border-default text-text-dim px-2 py-0.5"
                    >
                      #{cat.slug}
                    </span>
                  ))}
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-text-dim">
                    {formatDownloads(featured.downloads_total)} downloads
                  </span>
                  <span className="font-mono text-xs bg-accent text-black font-bold px-4 py-2 flex items-center gap-2">
                    View Plugin <ArrowRight className="w-[12px] h-[12px]" />
                  </span>
                </div>
              </div>
            </Link>
          ) : (
            <FeaturedPlaceholder />
          )}

          {/* Small cards — 2×2 grid */}
          <div className="col-span-1 lg:col-span-7 lg:row-span-2 grid grid-cols-2 grid-rows-2 gap-4">
            {rest.length > 0
              ? rest.map((plugin) => (
                  <SmallBentoCard key={plugin.id} plugin={plugin} />
                ))
              : ["ph-1","ph-2","ph-3","ph-4"].map((key) => (
                  <SmallPlaceholder key={key} />
                ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Small Bento Card ──────────────────────────────────────────────────────

function SmallBentoCard({ plugin }: { readonly plugin: PluginSummary }) {
  return (
    <Link
      href={`/plugins/${plugin.slug}`}
      className="bento-card border border-border-default bg-bg-elevated p-5 flex flex-col min-w-0 cursor-pointer"
    >
      <div className="mb-4">
        <PluginIcon
          pluginName={plugin.name}
          iconUrl={plugin.icon_url}
          sizeClassName="w-9 h-9"
        />
      </div>
      <h3 className="font-raleway font-bold text-lg text-text-primary mb-1 truncate">
        {plugin.name}
      </h3>
      <p className="font-mono text-[10px] text-text-dim mb-3 truncate">
        by <span className="text-text-subtle">{plugin.author.username}</span>
      </p>
      {plugin.short_description && (
        <p className="font-raleway text-xs text-text-dim leading-relaxed mb-auto line-clamp-3">
          {plugin.short_description}
        </p>
      )}
      <div className="mt-4">
        <span className="font-mono text-[10px] text-text-dim">
          {formatDownloads(plugin.downloads_total)} dl
        </span>
      </div>
    </Link>
  );
}

// ── Placeholders ──────────────────────────────────────────────────────────

function FeaturedPlaceholder() {
  return (
    <div className="bento-card col-span-1 lg:col-span-5 lg:row-span-2 border border-border-default bg-bg-elevated p-6 flex flex-col items-center justify-center">
      <span className="font-mono text-xs text-text-dim">
        No plugins yet — be the first to publish!
      </span>
    </div>
  );
}

function SmallPlaceholder() {
  return (
    <div className="bento-card border border-border-default bg-bg-elevated p-5 flex flex-col items-center justify-center">
      <div className="w-9 h-9 bg-bg-surface border border-border-hover mb-3" />
      <div className="h-3 w-24 bg-bg-surface mb-2" />
      <div className="h-2 w-16 bg-bg-surface" />
    </div>
  );
}
