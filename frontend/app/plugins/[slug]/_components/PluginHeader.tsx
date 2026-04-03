"use client";

import Link from "next/link";
import {
  Github,
  Terminal,
  Star,
} from "lucide-react";
import { Badge, PluginIcon } from "@/components/ui";
import { PluginActions } from "@/components/plugins/PluginActions";
import type { PluginResponse } from "@/lib/types";

// ── Helpers ───────────────────────────────────────────────────────────────

const NOW_MS = Date.now();

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const diffInSeconds = Math.floor((NOW_MS - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "just now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 2592000) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} ${days === 1 ? "day" : "days"} ago`;
  }
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ── Props ─────────────────────────────────────────────────────────────────

interface PluginHeaderProps {
  readonly plugin: PluginResponse;
}

export function PluginHeader({ plugin }: PluginHeaderProps) {
  const primaryCategory = plugin.categories[0];
  const isNew = NOW_MS - new Date(plugin.created_at).getTime() < 7 * 24 * 60 * 60 * 1000;

  return (
    <div className="border-b border-border-default py-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 font-mono text-xs text-text-dim mb-5">
        <Link
          href="/"
          className="hover:text-text-subtle transition-colors"
        >
          hub
        </Link>
        <span className="text-text-dim">/</span>
        <Link
          href="/explorer"
          className="hover:text-text-subtle transition-colors"
        >
          plugins
        </Link>
        {primaryCategory && (
          <>
            <span className="text-text-dim">/</span>
            <Link
              href={`/explorer?category=${primaryCategory.slug}`}
              className="hover:text-text-subtle transition-colors"
            >
              {primaryCategory.slug}
            </Link>
          </>
        )}
        <span className="text-text-dim">/</span>
        <span className="text-text-subtle">{plugin.slug}</span>
      </nav>

      {/* Plugin header row */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-start gap-5">
          {/* Icon */}
          <PluginIcon
            pluginName={plugin.name}
            iconUrl={plugin.icon_url}
            featured
            sizeClassName="w-14 h-14"
          />

          <div>
            <div className="flex items-center gap-3 mb-1.5 flex-wrap">
              <h1 className="font-raleway font-black text-3xl text-text-primary">
                {plugin.name}
              </h1>
              {isNew && <Badge variant="orange">NEW</Badge>}
            </div>
            <div className="flex items-center gap-4 font-mono text-xs text-text-dim flex-wrap">
              <span>
                by{" "}
                <Link
                  href={`/users/${plugin.author.username}`}
                  className="text-text-subtle hover:text-accent transition-colors"
                >
                  {plugin.author.username}
                </Link>
              </span>
              <span>·</span>
              <div className="flex items-center gap-1">
                <Star className="w-[11px] h-[11px] text-accent fill-accent" />
                <span className="text-text-subtle">
                  {plugin.review_count > 0
                    ? `${plugin.average_rating.toFixed(1)} (${plugin.review_count})`
                    : "—"}
                </span>
              </div>
              <span>·</span>
              <span>Updated {formatTimeAgo(plugin.updated_at)}</span>
              {plugin.license && (
                <>
                  <span>·</span>
                  <span>{plugin.license}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 flex-wrap sm:flex-shrink-0">
          <PluginActions plugin={plugin} />
          {plugin.repository_url && (
            <a
              href={plugin.repository_url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-xs border border-border-hover text-text-dim hover:border-text-dim px-4 py-2.5 transition-colors flex items-center gap-2"
            >
              <Github className="w-[14px] h-[14px]" />
              Source
            </a>
          )}
          <Link
            href={`/configurator?plugin=${plugin.slug}`}
            className="font-mono text-sm bg-accent hover:bg-accent-hover text-bg-base font-bold px-5 py-2.5 transition-colors flex items-center gap-2"
          >
            <Terminal className="w-[14px] h-[14px]" />
            Quick Test
          </Link>
        </div>
      </div>
    </div>
  );
}
