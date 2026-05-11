"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { usePlugins } from "@/lib/hooks";
import { PluginIcon } from "@/components/ui";
import { formatTimeAgo } from "@/components/ui/PluginCard";

export function RecentlyPublishedSection() {
  const { data, isLoading } = usePlugins({
    sort_by: "created_at",
    order: "desc",
    per_page: 3,
  });

  const plugins = data?.data ?? [];

  if (!isLoading && plugins.length === 0) return null;

  return (
    <section className="border-t border-border-default">
      <div className="max-w-7xl mx-auto px-6 py-14">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="h-px w-8 bg-accent" />
            <span className="font-mono text-xs text-accent tracking-widest uppercase">
              Recently Published
            </span>
          </div>
          <Link
            href="/explorer?sort=newest"
            className="font-mono text-xs text-text-subtle hover:text-accent transition-colors flex items-center gap-2"
          >
            View all <ArrowRight className="w-[14px] h-[14px]" />
          </Link>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {isLoading
            ? [1, 2, 3].map((k) => <RecentCardSkeleton key={k} />)
            : plugins.map((plugin) => (
                <Link
                  key={plugin.id}
                  href={`/plugins/${plugin.slug}`}
                  className="group border border-border-default bg-bg-elevated/30 hover:border-border-hover hover:bg-bg-elevated transition-colors p-5 flex flex-col gap-4"
                >
                  <div className="flex items-start gap-4">
                    <PluginIcon
                      pluginName={plugin.name}
                      iconUrl={plugin.icon_url}
                      sizeClassName="w-10 h-10"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-raleway font-bold text-base text-text-primary group-hover:text-accent transition-colors truncate">
                        {plugin.name}
                      </h3>
                      <p className="font-mono text-[10px] text-text-dim truncate">
                        by{" "}
                        <span className="text-text-subtle">
                          {plugin.author.username}
                        </span>
                      </p>
                    </div>
                  </div>

                  {plugin.short_description && (
                    <p className="font-raleway text-sm text-text-subtle leading-relaxed line-clamp-2">
                      {plugin.short_description}
                    </p>
                  )}

                  <div className="mt-auto flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-wrap">
                      {plugin.categories.slice(0, 2).map((cat) => (
                        <span
                          key={cat.id}
                          className="font-mono text-[10px] border border-border-default text-text-dim px-2 py-0.5"
                        >
                          #{cat.slug}
                        </span>
                      ))}
                    </div>
                    <span className="font-mono text-[10px] text-accent shrink-0">
                      {formatTimeAgo(plugin.created_at)}
                    </span>
                  </div>
                </Link>
              ))}
        </div>
      </div>
    </section>
  );
}

function RecentCardSkeleton() {
  return (
    <div className="border border-border-default bg-bg-elevated/30 p-5 animate-pulse space-y-4">
      <div className="flex gap-4">
        <div className="w-10 h-10 bg-bg-surface border border-border-default shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-32 bg-bg-surface" />
          <div className="h-3 w-20 bg-bg-surface" />
        </div>
      </div>
      <div className="space-y-1.5">
        <div className="h-3 w-full bg-bg-surface" />
        <div className="h-3 w-3/4 bg-bg-surface" />
      </div>
    </div>
  );
}
