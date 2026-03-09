"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Github,
  BookOpen,
  Bug,
  MessageCircle,
  ArrowUpRight,
} from "lucide-react";
import type { PluginResponse } from "@/lib/types";
import { usePluginVersions } from "@/lib/hooks";

// ── Helpers ───────────────────────────────────────────────────────────────

function formatDownloads(count: number): string {
  return count.toLocaleString();
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

// ── Props ─────────────────────────────────────────────────────────────────

interface PluginSidebarProps {
  plugin: PluginResponse;
}

export function PluginSidebar({ plugin }: PluginSidebarProps) {
  const { data: versionsData } = usePluginVersions(plugin.slug);
  const latestVersion = versionsData?.versions.find((v) => !v.is_yanked)?.version ?? null;

  return (
    <aside className="w-72 flex-shrink-0 hidden lg:block">
      <div className="sidebar-sticky space-y-6">
        <StatisticsCard downloads={plugin.downloads_total} />
        <LinksCard plugin={plugin} />
        <DetailsCard plugin={plugin} latestVersion={latestVersion} />
        <AuthorCard plugin={plugin} />
      </div>
    </aside>
  );
}

// ── Statistics Card ───────────────────────────────────────────────────────

function StatisticsCard({ downloads }: { downloads: number }) {
  // Placeholder weekly chart — real data will come from a future stats API
  const WEEKLY_HEIGHTS = [30, 45, 38, 60, 55, 70, 85, 100];

  return (
    <div className="border border-border-default bg-bg-elevated/30 p-5">
      <div className="font-mono text-[10px] text-text-dim uppercase tracking-widest mb-4">
        Statistics
      </div>

      <div className="flex items-baseline gap-2 mb-1">
        <span className="font-mono text-3xl font-bold text-text-primary">
          {formatDownloads(downloads)}
        </span>
        <span className="font-mono text-xs text-text-dim">total downloads</span>
      </div>

      {/* Mini chart */}
      <div className="mb-1 mt-5">
        <div className="font-mono text-[10px] text-border-hover mb-2">
          Last 8 weeks
        </div>
        <div className="flex items-end gap-1 h-16">
          {WEEKLY_HEIGHTS.map((height, index) => (
            <div
              key={index}
              className={`chart-bar flex-1 ${
                index === WEEKLY_HEIGHTS.length - 1
                  ? "bg-accent opacity-80"
                  : ""
              }`}
              style={{ height: `${height}%` }}
            />
          ))}
        </div>
      </div>

      <div className="border-t border-border-default pt-4 mt-4 space-y-2">
        <div className="flex justify-between font-mono text-xs">
          <span className="text-text-dim">All time</span>
          <span className="text-text-primary">{formatDownloads(downloads)}</span>
        </div>
      </div>
    </div>
  );
}

// ── Links Card ────────────────────────────────────────────────────────────

function LinksCard({ plugin }: { plugin: PluginResponse }) {
  const links = [
    plugin.repository_url
      ? { icon: Github, label: "Source Repository", href: plugin.repository_url }
      : null,
    plugin.documentation_url
      ? { icon: BookOpen, label: "Documentation", href: plugin.documentation_url }
      : null,
    { icon: Bug, label: "Report Issue", href: plugin.repository_url ? `${plugin.repository_url}/issues` : "#" },
    { icon: MessageCircle, label: "Discord Support", href: "#" },
  ].filter(Boolean) as { icon: typeof Github; label: string; href: string }[];

  if (links.length === 0) return null;

  return (
    <div className="border border-border-default bg-bg-elevated/30 p-5">
      <div className="font-mono text-[10px] text-text-dim uppercase tracking-widest mb-4">
        Links
      </div>
      <div className="space-y-2">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <a
              key={link.label}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 font-mono text-xs text-text-dim hover:text-accent transition-colors group"
            >
              <Icon className="w-[14px] h-[14px]" />
              <span>{link.label}</span>
              <ArrowUpRight className="ml-auto w-[11px] h-[11px] text-border-hover group-hover:text-accent" />
            </a>
          );
        })}
      </div>
    </div>
  );
}

// ── Details Card ──────────────────────────────────────────────────────────

function DetailsCard({
  plugin,
  latestVersion,
}: {
  plugin: PluginResponse;
  latestVersion: string | null;
}) {
  const details = [
    { label: "Published", value: formatDate(plugin.created_at) },
    { label: "Updated", value: formatDate(plugin.updated_at) },
    plugin.license ? { label: "License", value: plugin.license } : null,
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <div className="border border-border-default bg-bg-elevated/30 p-5">
      <div className="font-mono text-[10px] text-text-dim uppercase tracking-widest mb-4">
        Details
      </div>
      {latestVersion && (
        <div className="flex justify-between items-center mb-2.5">
          <span className="font-mono text-[10px] text-text-dim">Version</span>
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-[10px] text-text-subtle">
              v{latestVersion}
            </span>
            <span className="font-mono text-[9px] bg-accent/10 text-accent border border-accent/30 px-1.5 py-0.5">
              LATEST
            </span>
          </div>
        </div>
      )}
      <div className="space-y-2.5">
        {details.map((detail) => (
          <div key={detail.label} className="flex justify-between">
            <span className="font-mono text-[10px] text-text-dim">
              {detail.label}
            </span>
            <span className="font-mono text-[10px] text-text-subtle">
              {detail.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Author Card ───────────────────────────────────────────────────────────

function AuthorCard({ plugin }: { plugin: PluginResponse }) {
  const initials = plugin.author.username.slice(0, 2).toLowerCase();

  return (
    <Link
      href={`/users/${plugin.author.username}`}
      className="block border border-border-default bg-bg-elevated/30 p-5 hover:border-border-hover transition-colors"
    >
      <div className="font-mono text-[10px] text-text-dim uppercase tracking-widest mb-4">
        Author
      </div>
      <div className="flex items-center gap-3">
        {plugin.author.avatar_url ? (
          <Image
            src={plugin.author.avatar_url}
            alt={plugin.author.username}
            width={40}
            height={40}
            className="w-10 h-10 border border-accent/30"
          />
        ) : (
          <div className="w-10 h-10 bg-accent/20 border border-accent/30 flex items-center justify-center font-mono font-bold text-accent text-sm">
            {initials}
          </div>
        )}
        <div>
          <div className="font-raleway font-bold text-sm text-text-primary">
            {plugin.author.username}
          </div>
          <div className="font-mono text-[10px] text-text-dim">
            Plugin Author
          </div>
        </div>
      </div>
    </Link>
  );
}
