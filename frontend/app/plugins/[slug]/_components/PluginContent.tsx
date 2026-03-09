"use client";

import { useState } from "react";
import { Package, AlertTriangle, Plus, ChevronDown, ChevronRight } from "lucide-react";
import { mutate } from "swr";
import type { PluginResponse, VersionResponse, CreateVersionRequest } from "@/lib/types";
import { usePluginVersions, useCurrentUser, useBinaries } from "@/lib/hooks";
import { createVersion, getPluginVersionsPath, getBinariesPath } from "@/lib/api";
import { VersionForm } from "@/components/plugins/VersionForm";
import { VersionManager } from "@/components/plugins/VersionManager";
import { BinaryUpload } from "@/components/plugins/BinaryUpload";
import { BinaryList } from "@/components/plugins/BinaryList";

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
      {activeTab === "versions" && <VersionsTab plugin={plugin} />}
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

// ── Versions Tab — live API data ──────────────────────────────────────────

function VersionsTab({ plugin }: { plugin: PluginResponse }) {
  const { data: user } = useCurrentUser();
  const { data, isLoading, error } = usePluginVersions(plugin.slug);
  const [showPublishForm, setShowPublishForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canManage =
    user &&
    (user.id === plugin.author.id ||
      user.role === "moderator" ||
      user.role === "admin");

  function revalidateVersions() {
    mutate(getPluginVersionsPath(plugin.slug));
  }

  async function handlePublish(formData: import("@/lib/validation").VersionFormData) {
    setIsSubmitting(true);
    try {
      const body: CreateVersionRequest = {
        version: formData.version,
        changelog: formData.changelog || undefined,
        pumpkin_version_min: formData.pumpkinVersionMin || undefined,
        pumpkin_version_max: formData.pumpkinVersionMax || undefined,
      };
      await createVersion(plugin.slug, body);
      revalidateVersions();
      setShowPublishForm(false);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return <VersionsTabSkeleton />;
  }

  if (error || !data) {
    return (
      <p className="font-mono text-xs text-red-400">
        Failed to load versions. Please try again later.
      </p>
    );
  }

  const { versions, total } = data;

  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="w-12 h-12 border border-border-default bg-bg-surface flex items-center justify-center mb-4">
          <Package className="text-text-dim w-5 h-5" />
        </div>
        <p className="font-mono text-xs text-text-dim mb-4">
          No versions published yet.
        </p>
        {canManage && !showPublishForm && (
          <button
            onClick={() => setShowPublishForm(true)}
            className="font-mono text-xs bg-accent hover:bg-accent-dark text-black font-bold px-4 py-2 transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Publish First Version
          </button>
        )}
        {canManage && showPublishForm && (
          <div className="w-full max-w-lg mt-4 border border-border-default bg-bg-elevated p-6">
            <h3 className="font-raleway font-bold text-sm text-text-primary mb-4">
              Publish Version
            </h3>
            <VersionForm
              onSubmit={handlePublish}
              isSubmitting={isSubmitting}
              onCancel={() => setShowPublishForm(false)}
            />
          </div>
        )}
      </div>
    );
  }

  // First non-yanked version is the latest
  const latestVersion = versions.find((v) => !v.is_yanked);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <span className="font-mono text-xs text-text-dim">
          {total} release{total !== 1 ? "s" : ""}
          {latestVersion && (
            <>
              {" · "}
              <span className="text-text-primary">
                v{latestVersion.version}
              </span>{" "}
              is latest
            </>
          )}
        </span>
        {canManage && !showPublishForm && (
          <button
            onClick={() => setShowPublishForm(true)}
            className="font-mono text-xs bg-accent hover:bg-accent-dark text-black font-bold px-4 py-2 transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Publish Version
          </button>
        )}
      </div>

      {/* Publish form */}
      {canManage && showPublishForm && (
        <div className="mb-6 border border-accent/30 bg-bg-elevated p-6">
          <h3 className="font-raleway font-bold text-sm text-text-primary mb-4">
            Publish New Version
          </h3>
          <VersionForm
            onSubmit={handlePublish}
            isSubmitting={isSubmitting}
            onCancel={() => setShowPublishForm(false)}
          />
        </div>
      )}

      {/* Versions table */}
      <div className="border border-border-default">
        {/* Header */}
        <div className="grid grid-cols-12 gap-4 px-4 py-2.5 border-b border-border-default bg-bg-elevated/50">
          <div className="col-span-3 font-mono text-[10px] text-text-dim uppercase tracking-widest">
            Version
          </div>
          <div className="col-span-3 font-mono text-[10px] text-text-dim uppercase tracking-widest">
            Pumpkin Compat
          </div>
          <div className="col-span-2 font-mono text-[10px] text-text-dim uppercase tracking-widest">
            Published
          </div>
          <div className="col-span-2 font-mono text-[10px] text-text-dim uppercase tracking-widest">
            Downloads
          </div>
          <div className="col-span-2 font-mono text-[10px] text-text-dim uppercase tracking-widest">
            Status
          </div>
        </div>

        {/* Rows */}
        {versions.map((version) => {
          const isLatest = latestVersion?.id === version.id;
          return (
            <VersionRow
              key={version.id}
              version={version}
              isLatest={isLatest}
              canManage={!!canManage}
              slug={plugin.slug}
              onMutated={revalidateVersions}
            />
          );
        })}
      </div>
    </div>
  );
}

function VersionRow({
  version,
  isLatest,
  canManage,
  slug,
  onMutated,
}: {
  version: VersionResponse;
  isLatest: boolean;
  canManage: boolean;
  slug: string;
  onMutated: () => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { data: binariesData, isLoading: binariesLoading } = useBinaries(
    isExpanded ? slug : null,
    isExpanded ? version.version : null,
  );

  const compatRange = formatCompatRange(
    version.pumpkin_version_min,
    version.pumpkin_version_max,
  );
  const publishedDate = new Date(version.published_at).toLocaleDateString(
    "en-US",
    { year: "numeric", month: "short", day: "numeric" },
  );

  function revalidateBinaries() {
    mutate(getBinariesPath(slug, version.version));
  }

  return (
    <div
      className={`border-b border-border-default last:border-b-0 ${
        version.is_yanked ? "opacity-60" : ""
      }`}
    >
      {/* Main row — clickable to expand */}
      <div
        className="ver-row grid grid-cols-12 gap-4 px-4 py-3.5 items-center cursor-pointer hover:bg-bg-elevated/30 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Expand indicator + Version number + badges */}
        <div className="col-span-3 flex items-center gap-2 flex-wrap">
          {isExpanded ? (
            <ChevronDown className="w-3 h-3 text-text-dim flex-shrink-0" />
          ) : (
            <ChevronRight className="w-3 h-3 text-text-dim flex-shrink-0" />
          )}
          <span
            className={`font-mono text-sm font-bold ${
              version.is_yanked
                ? "text-text-dim line-through"
                : isLatest
                  ? "text-text-primary"
                  : "text-text-dim"
            }`}
          >
            {version.version}
          </span>
          {isLatest && !version.is_yanked && (
            <span className="font-mono text-[9px] bg-accent/10 text-accent border border-accent/30 px-1.5 py-0.5">
              LATEST
            </span>
          )}
          {version.is_yanked && (
            <span className="font-mono text-[9px] bg-red-500/10 text-red-400 border border-red-500/30 px-1.5 py-0.5 inline-flex items-center gap-1">
              <AlertTriangle className="w-2.5 h-2.5" />
              YANKED
            </span>
          )}
        </div>

        {/* Pumpkin compatibility range */}
        <div className="col-span-3 font-mono text-xs text-text-dim">
          {compatRange}
        </div>

        {/* Published date */}
        <div className="col-span-2 font-mono text-xs text-text-dim">
          {publishedDate}
        </div>

        {/* Downloads */}
        <div className="col-span-2 font-mono text-xs text-text-dim">
          {version.downloads.toLocaleString()}
        </div>

        {/* Status indicator + actions */}
        <div className="col-span-2 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          {version.is_yanked ? (
            <span className="w-2 h-2 bg-red-400 inline-block" title="Yanked" />
          ) : (
            <span className="w-2 h-2 bg-green-500 inline-block" title="Available" />
          )}
          {canManage && (
            <VersionManager
              slug={slug}
              version={version}
              onMutated={onMutated}
            />
          )}
        </div>
      </div>

      {/* Expanded panel — binaries */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-1 bg-bg-elevated/20 border-t border-border-default">
          <h4 className="font-mono text-[10px] text-text-dim uppercase tracking-widest mb-3">
            Binaries
          </h4>

          {binariesLoading && (
            <div className="animate-pulse space-y-2">
              <div className="h-10 bg-bg-surface" />
              <div className="h-10 bg-bg-surface" />
            </div>
          )}

          {binariesData && (
            <>
              <BinaryList
                slug={slug}
                version={version.version}
                binaries={binariesData.binaries}
              />

              {/* Upload section for owners/admins */}
              {canManage && !version.is_yanked && (
                <div className="mt-4">
                  <BinaryUpload
                    slug={slug}
                    version={version.version}
                    existingPlatforms={binariesData.binaries.map((b) => b.platform)}
                    onUploaded={revalidateBinaries}
                  />
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

/** Formats the Pumpkin compatibility range from min/max fields. */
function formatCompatRange(
  min: string | null,
  max: string | null,
): string {
  if (min && max) return `${min} — ${max}`;
  if (min) return `≥ ${min}`;
  if (max) return `≤ ${max}`;
  return "Any";
}

function VersionsTabSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="h-3 bg-bg-surface w-48 mb-6" />
      <div className="border border-border-default">
        <div className="h-8 bg-bg-surface/50 border-b border-border-default" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-12 border-b border-border-default last:border-b-0 flex items-center px-4"
          >
            <div className="h-3 bg-bg-surface w-full" />
          </div>
        ))}
      </div>
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
