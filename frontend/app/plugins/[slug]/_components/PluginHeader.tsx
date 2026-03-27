"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Github,
  Terminal,
  CheckCircle,
  Shield,
  Cpu,
  Star,
  Copy,
  Check,
  X,
} from "lucide-react";
import { Badge, PluginIcon } from "@/components/ui";
import { PluginActions } from "@/components/plugins/PluginActions";
import type { PluginResponse } from "@/lib/types";

// ── Helpers ───────────────────────────────────────────────────────────────

function formatTimeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

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
  const [installOpen, setInstallOpen] = useState(false);

  const primaryCategory = plugin.categories[0];

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
              {Date.now() - new Date(plugin.created_at).getTime() < 7 * 24 * 60 * 60 * 1000 && (
                <Badge variant="orange">NEW</Badge>
              )}
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
          <button
            onClick={() => setInstallOpen(!installOpen)}
            className="font-mono text-sm bg-accent hover:bg-accent-hover text-bg-base font-bold px-5 py-2.5 transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Terminal className="w-[14px] h-[14px]" />
            Quick Install
          </button>
        </div>
      </div>

      {/* Install panel */}
      <div
        className={`overflow-hidden transition-all duration-300 ${
          installOpen ? "max-h-[300px] mt-4" : "max-h-0"
        }`}
      >
        <InstallPanel
          pluginSlug={plugin.slug}
          onClose={() => setInstallOpen(false)}
        />
      </div>
    </div>
  );
}

// ── Install Panel ─────────────────────────────────────────────────────────

function InstallPanel({
  pluginSlug,
  onClose,
}: {
  readonly pluginSlug: string;
  readonly onClose: () => void;
}) {
  return (
    <div className="border border-accent/30 bg-bg-elevated p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="font-mono text-xs text-accent uppercase tracking-widest">
          Install via Pumpkin CLI
        </span>
        <button
          onClick={onClose}
          aria-label="Close install panel"
          title="Close install panel"
          className="font-mono text-xs text-text-dim hover:text-text-primary transition-colors cursor-pointer"
        >
          <X className="w-[14px] h-[14px]" />
        </button>
      </div>

      {/* Method 1: CLI */}
      <div className="mb-3">
        <div className="font-mono text-[10px] text-text-dim mb-1.5">
          Method 1 — CLI (recommended)
        </div>
        <CopyableCommand command={`pumpkin install ${pluginSlug}`} />
      </div>

      {/* Method 2: Cargo.toml */}
      <div className="mb-3">
        <div className="font-mono text-[10px] text-text-dim mb-1.5">
          Method 2 — Cargo.toml
        </div>
        <CopyableCommand
          command={`[dependencies]\n${pluginSlug} = "latest"`}
          display={
            <>
              <span className="text-text-dim">[dependencies]</span>
              <br />
              <span className="text-accent">{pluginSlug}</span>
              {" = "}
              <span className="text-green-400">&quot;latest&quot;</span>
            </>
          }
        />
      </div>

      {/* Verification badges */}
      <div className="flex items-center gap-4 font-mono text-[10px] text-text-dim">
        <span className="flex items-center gap-1">
          <CheckCircle className="w-[11px] h-[11px] text-green-500" />
          SHA-256 verified
        </span>
        <span className="flex items-center gap-1">
          <Shield className="w-[11px] h-[11px] text-green-500" />
          No unsafe blocks
        </span>
        <span className="flex items-center gap-1">
          <Cpu className="w-[11px] h-[11px] text-text-dim" />
          x86_64, aarch64
        </span>
      </div>
    </div>
  );
}

// ── Copyable Command ──────────────────────────────────────────────────────

function CopyableCommand({
  command,
  display,
}: {
  readonly command: string;
  readonly display?: React.ReactNode;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API not available in some environments
    }
  }

  return (
    <div className="bg-bg-base border border-border-default p-3 flex items-center justify-between gap-4">
      <code className="font-mono text-sm text-text-subtle flex-1 overflow-x-auto whitespace-pre">
        {display ?? (
          <>
            <span className="text-accent select-none">$ </span>
            {command}
          </>
        )}
      </code>
      <button
        onClick={handleCopy}
        className="font-mono text-[10px] border border-border-hover text-text-dim hover:border-accent hover:text-accent px-3 py-1.5 transition-colors flex-shrink-0 flex items-center gap-1 cursor-pointer"
      >
        {copied ? (
          <>
            <Check className="w-[10px] h-[10px]" />
            COPIED
          </>
        ) : (
          <>
            <Copy className="w-[10px] h-[10px]" />
            COPY
          </>
        )}
      </button>
    </div>
  );
}
