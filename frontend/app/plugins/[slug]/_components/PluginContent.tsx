"use client";

import { Package } from "lucide-react";
import type { PluginResponse } from "@/lib/types";

type TabId = "overview" | "versions" | "dependencies";

const TABS: { id: TabId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "versions", label: "Versions" },
  { id: "dependencies", label: "Dependencies" },
];

interface PluginContentProps {
  plugin: PluginResponse;
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

export function PluginContent({
  plugin,
  activeTab,
  onTabChange,
}: PluginContentProps) {
  return (
    <div className="flex-1 min-w-0">
      {/* Tab bar */}
      <div className="border-b border-border-default flex gap-0 mb-8">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`tab-btn font-mono text-xs px-5 py-3 uppercase tracking-widest transition-colors cursor-pointer ${
              activeTab === tab.id
                ? "active text-text-primary border-b-2 border-accent"
                : "text-text-dim hover:text-text-subtle"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "overview" && <OverviewTab plugin={plugin} />}
      {activeTab === "versions" && <VersionsTab />}
      {activeTab === "dependencies" && <DependenciesTab />}
    </div>
  );
}

// ── Overview Tab ──────────────────────────────────────────────────────────

function OverviewTab({ plugin }: { plugin: PluginResponse }) {
  // If the API returns a description, render it as markdown-like content.
  // For now, use the description field or a placeholder.
  if (plugin.description) {
    return (
      <div className="md-content">
        {/* Render description as pre-formatted content since we don't have
            a markdown parser yet. The md-content class from globals.css
            will style nested elements appropriately. */}
        <div dangerouslySetInnerHTML={{ __html: formatDescription(plugin.description) }} />
      </div>
    );
  }

  return (
    <div className="md-content">
      <h2>About {plugin.name}</h2>
      <p>
        {plugin.short_description ?? "No description provided yet. Check back later for documentation and usage guides."}
      </p>
    </div>
  );
}

/**
 * Basic text → HTML transformer for plugin descriptions.
 * Converts line-based formatting to styled HTML without external dependencies.
 *
 * Why here instead of a library: YAGNI — a full markdown parser isn't needed
 * until user-generated content grows. This covers headings, lists, code blocks,
 * inline code, and paragraphs.
 */
function formatDescription(raw: string): string {
  const lines = raw.split("\n");
  const htmlParts: string[] = [];
  let inCodeBlock = false;
  let codeBuffer: string[] = [];

  for (const line of lines) {
    // Code block toggle
    if (line.trim().startsWith("```")) {
      if (inCodeBlock) {
        htmlParts.push(`<pre>${escapeHtml(codeBuffer.join("\n"))}</pre>`);
        codeBuffer = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      continue;
    }

    const trimmed = line.trim();

    // Blank line → break accumulation
    if (trimmed === "") {
      continue;
    }

    // Headings
    if (trimmed.startsWith("### ")) {
      htmlParts.push(`<h3>${escapeHtml(trimmed.slice(4))}</h3>`);
      continue;
    }
    if (trimmed.startsWith("## ")) {
      htmlParts.push(`<h2>${escapeHtml(trimmed.slice(3))}</h2>`);
      continue;
    }

    // List items
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      htmlParts.push(`<ul><li>${inlineFormat(trimmed.slice(2))}</li></ul>`);
      continue;
    }

    // Paragraph
    htmlParts.push(`<p>${inlineFormat(trimmed)}</p>`);
  }

  // Close unclosed code block
  if (inCodeBlock && codeBuffer.length > 0) {
    htmlParts.push(`<pre>${escapeHtml(codeBuffer.join("\n"))}</pre>`);
  }

  return htmlParts.join("\n");
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function inlineFormat(text: string): string {
  return escapeHtml(text).replace(
    /`([^`]+)`/g,
    "<code>$1</code>",
  );
}

// ── Versions Tab (placeholder until API supports version listing) ─────────

function VersionsTab() {
  const PLACEHOLDER_VERSIONS = [
    { version: "2.1.3", api: "0.4.x", arch: "x86_64, arm64", size: "2.1 MB", latest: true },
    { version: "2.1.2", api: "0.4.x", arch: "x86_64, arm64", size: "2.1 MB", latest: false },
    { version: "2.0.0", api: "0.4.x", arch: "x86_64", size: "1.9 MB", latest: false },
    { version: "1.8.4", api: "0.3.x", arch: "x86_64", size: "1.7 MB", latest: false },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <span className="font-mono text-xs text-text-dim">
          {PLACEHOLDER_VERSIONS.length} releases ·{" "}
          <span className="text-text-primary">v{PLACEHOLDER_VERSIONS[0].version}</span>{" "}
          is latest
        </span>
      </div>

      {/* Versions table */}
      <div className="border border-border-default">
        {/* Header */}
        <div className="grid grid-cols-12 gap-4 px-4 py-2.5 border-b border-border-default bg-bg-elevated/50">
          <div className="col-span-3 font-mono text-[10px] text-text-dim uppercase tracking-widest">
            Version
          </div>
          <div className="col-span-2 font-mono text-[10px] text-text-dim uppercase tracking-widest">
            API Compat
          </div>
          <div className="col-span-3 font-mono text-[10px] text-text-dim uppercase tracking-widest">
            Architecture
          </div>
          <div className="col-span-2 font-mono text-[10px] text-text-dim uppercase tracking-widest">
            Size
          </div>
          <div className="col-span-2 font-mono text-[10px] text-text-dim uppercase tracking-widest">
            Download
          </div>
        </div>

        {/* Rows */}
        {PLACEHOLDER_VERSIONS.map((version) => (
          <div
            key={version.version}
            className="ver-row grid grid-cols-12 gap-4 px-4 py-3.5 border-b border-border-default items-center last:border-b-0"
          >
            <div className="col-span-3 flex items-center gap-2">
              <span
                className={`font-mono text-sm font-bold ${
                  version.latest ? "text-text-primary" : "text-text-dim"
                }`}
              >
                {version.version}
              </span>
              {version.latest && (
                <span className="font-mono text-[9px] bg-accent/10 text-accent border border-accent/30 px-1.5 py-0.5">
                  LATEST
                </span>
              )}
            </div>
            <div className="col-span-2 font-mono text-xs text-text-dim">
              {version.api}
            </div>
            <div className="col-span-3 font-mono text-xs text-text-dim">
              {version.arch}
            </div>
            <div className="col-span-2 font-mono text-xs text-text-dim">
              {version.size}
            </div>
            <div className="col-span-2">
              <button
                className={`dl-btn font-mono text-[10px] font-bold px-3 py-1 transition-colors cursor-pointer ${
                  version.latest
                    ? "bg-accent hover:bg-accent-hover text-bg-base"
                    : "border border-border-hover text-text-dim hover:border-accent hover:text-accent"
                }`}
              >
                ↓ Download
              </button>
            </div>
          </div>
        ))}
      </div>

      <p className="font-mono text-[10px] text-text-dim mt-4">
        Version details and download links will be available once the Versions API is implemented.
      </p>
    </div>
  );
}

// ── Dependencies Tab (placeholder) ────────────────────────────────────────

function DependenciesTab() {
  const PLACEHOLDER_DEPENDENCIES = [
    { name: "pumpkin-api", version: "^0.4.0", description: "Core Pumpkin server bindings", safe: true },
    { name: "tokio", version: "^1.35", description: "Async runtime · features: rt-multi-thread, sync", safe: true },
    { name: "serde", version: "^1.0", description: "Serialization framework · features: derive", safe: true },
    { name: "sqlx", version: "^0.7", description: "Async SQL toolkit · features: sqlite, postgres", safe: true },
  ];

  return (
    <div>
      <div className="mb-6">
        <span className="font-mono text-xs text-text-dim">
          {PLACEHOLDER_DEPENDENCIES.length} runtime dependencies ·{" "}
          <span className="text-text-primary">0</span> unsafe crates
        </span>
      </div>

      <div className="space-y-3">
        {PLACEHOLDER_DEPENDENCIES.map((dep) => (
          <div
            key={dep.name}
            className="dep-card border border-border-default bg-bg-elevated/30 p-4 flex items-center justify-between transition-colors hover:border-border-hover"
          >
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 border border-border-hover flex items-center justify-center">
                <Package className="text-text-dim w-[14px] h-[14px]" />
              </div>
              <div>
                <div className="font-mono text-sm text-text-primary mb-0.5">
                  {dep.name}{" "}
                  <span className="text-text-dim">{dep.version}</span>
                </div>
                <div className="font-mono text-[10px] text-text-dim">
                  {dep.description}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {dep.safe && (
                <span className="font-mono text-[10px] text-green-500 border border-green-500/20 bg-green-500/5 px-2 py-0.5">
                  ✓ No unsafe
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <p className="font-mono text-[10px] text-text-dim mt-4">
        Dependency tracking will be populated automatically once crate analysis is live.
      </p>
    </div>
  );
}
