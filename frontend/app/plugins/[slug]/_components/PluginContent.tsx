"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { Package, AlertTriangle, Plus, ChevronDown, ChevronRight, GitBranch, ArrowRight, X, Loader2 } from "lucide-react";
import { mutate } from "swr";
import type { PluginResponse, VersionResponse, CreateVersionRequest, DependencyConflict, DependencyGraphNode } from "@/lib/types";
import { usePluginVersions, useCurrentUser, useBinaries, useDependencies, useDependencyGraph, useDependants } from "@/lib/hooks";
import { createVersion, getPluginVersionsPath, getBinariesPath, declareDependency, removeDependency, getDependenciesPath, getDependencyGraphPath } from "@/lib/api";
import { VersionForm } from "@/components/plugins/VersionForm";
import { VersionManager } from "@/components/plugins/VersionManager";
import { BinaryUpload } from "@/components/plugins/BinaryUpload";
import { BinaryList } from "@/components/plugins/BinaryList";
import { ReviewSection } from "@/components/reviews";
import { GalleryTab } from "@/components/plugins/GalleryTab";
import { ChangelogTab } from "@/components/plugins/ChangelogTab";
import { formatMarkdown } from "@/lib/markdown";

type TabId = "overview" | "versions" | "dependencies" | "gallery" | "changelog" | "reviews";

const TABS: { id: TabId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "versions", label: "Versions" },
  { id: "dependencies", label: "Dependencies" },
  { id: "gallery", label: "Gallery" },
  { id: "changelog", label: "Changelog" },
  { id: "reviews", label: "Reviews" },
];

interface PluginContentProps {
  readonly plugin: PluginResponse;
  readonly activeTab: TabId;
  readonly onTabChange: (tab: TabId) => void;
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
      {activeTab === "dependencies" && <DependenciesTab plugin={plugin} />}
      {activeTab === "gallery" && <GalleryTab plugin={plugin} />}
      {activeTab === "changelog" && <ChangelogTab plugin={plugin} />}
      {activeTab === "reviews" && <ReviewSection plugin={plugin} />}
    </div>
  );
}

// ── Overview Tab ──────────────────────────────────────────────────────────

function OverviewTab({ plugin }: { readonly plugin: PluginResponse }) {
  // If the API returns a description, render it as markdown-like content.
  // For now, use the description field or a placeholder.
  if (plugin.description) {
    return (
      <div className="md-content">
        {/* Render description as pre-formatted content since we don't have
            a markdown parser yet. The md-content class from globals.css
            will style nested elements appropriately. */}
        <div dangerouslySetInnerHTML={{ __html: formatMarkdown(plugin.description) }} />
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

// ── Versions Tab — live API data ──────────────────────────────────────────

function VersionsTab({ plugin }: { readonly plugin: PluginResponse }) {
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
          {total} release{total === 1 ? "" : "s"}
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
          <div className="col-span-3 font-mono text-xs text-text-muted uppercase tracking-widest">
            Version
          </div>
          <div className="col-span-3 font-mono text-xs text-text-muted uppercase tracking-widest">
            Pumpkin Compat
          </div>
          <div className="col-span-2 font-mono text-xs text-text-muted uppercase tracking-widest">
            Published
          </div>
          <div className="col-span-2 font-mono text-xs text-text-muted uppercase tracking-widest">
            Downloads
          </div>
          <div className="col-span-2 font-mono text-xs text-text-muted uppercase tracking-widest">
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
  readonly version: VersionResponse;
  readonly isLatest: boolean;
  readonly canManage: boolean;
  readonly slug: string;
  readonly onMutated: () => void;
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
  const versionTextClass = version.is_yanked
    ? "text-text-dim line-through"
    : isLatest
      ? "text-text-primary"
      : "text-text-dim";
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
      <button
        type="button"
        className="ver-row grid grid-cols-12 gap-4 px-4 py-3.5 items-center cursor-pointer hover:bg-bg-elevated/30 transition-colors w-full text-left"
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
            className={`font-mono text-sm font-bold ${versionTextClass}`}
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
        <div
          className="col-span-2 flex items-center gap-2"
          onClick={(e) => e.stopPropagation()}
        >
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
      </button>

      {/* Expanded panel — binaries */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-1 bg-bg-elevated/20 border-t border-border-default">
          <h4 className="font-mono text-xs text-text-muted uppercase tracking-widest mb-3">
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
        {Array.from({ length: 4 }, (_, i) => (
          <div
            key={`skeleton-ver-${i}`}
            className="h-12 border-b border-border-default last:border-b-0 flex items-center px-4"
          >
            <div className="h-3 bg-bg-surface w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Dependencies Tab ──────────────────────────────────────────────────────

type DependencyView = "list" | "graph" | "dependants";

function DependenciesTab({ plugin }: { readonly plugin: PluginResponse }) {
  const { data: versionsData } = usePluginVersions(plugin.slug);
  const { data: user } = useCurrentUser();
  const [activeView, setActiveView] = useState<DependencyView>("list");

  const latestVersion = versionsData?.versions.find((v) => !v.is_yanked);
  const latestVersionString = latestVersion?.version ?? null;

  const isOwner =
    user && (user.id === plugin.author.id || user.role === "admin");

  const VIEWS: { id: DependencyView; label: string }[] = [
    { id: "list", label: "Dependencies" },
    { id: "graph", label: "Graph" },
    { id: "dependants", label: "Dependants" },
  ];

  if (!latestVersionString) {
    return (
      <div className="border border-border-default bg-bg-elevated/30 p-8 text-center">
        <GitBranch className="w-8 h-8 text-text-dim mx-auto mb-3" />
        <p className="font-mono text-xs text-text-dim">
          No published versions yet. Dependencies can be declared after publishing a version.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Sub-navigation */}
      <div className="flex gap-4 mb-6">
        {VIEWS.map((view) => (
          <button
            key={view.id}
            onClick={() => setActiveView(view.id)}
            className={`font-mono text-[11px] px-3 py-1.5 transition-colors cursor-pointer ${
              activeView === view.id
                ? "text-accent border border-accent/40 bg-accent/5"
                : "text-text-dim border border-border-default hover:border-border-hover hover:text-text-subtle"
            }`}
          >
            {view.label}
          </button>
        ))}
      </div>

      {activeView === "list" && (
        <DependencyListView
          plugin={plugin}
          version={latestVersionString}
          isOwner={!!isOwner}
        />
      )}
      {activeView === "graph" && (
        <DependencyGraphView
          slug={plugin.slug}
          version={latestVersionString}
        />
      )}
      {activeView === "dependants" && (
        <DependantsView slug={plugin.slug} />
      )}
    </div>
  );
}

// ── Dependency List View ──────────────────────────────────────────────────

function DependencyListView({
  plugin,
  version,
  isOwner,
}: {
  readonly plugin: PluginResponse;
  readonly version: string;
  readonly isOwner: boolean;
}) {
  const { data, isLoading } = useDependencies(plugin.slug, version);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isRemoving, setIsRemoving] = useState<string | null>(null);

  const handleRemove = useCallback(
    async (dependencyId: string) => {
      setIsRemoving(dependencyId);
      try {
        await removeDependency(plugin.slug, version, dependencyId);
        mutate(getDependenciesPath(plugin.slug, version));
        mutate(getDependencyGraphPath(plugin.slug, version));
      } finally {
        setIsRemoving(null);
      }
    },
    [plugin.slug, version],
  );

  if (isLoading) {
    return <DependencyListSkeleton />;
  }

  const dependencies = data?.dependencies ?? [];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <span className="font-mono text-xs text-text-dim">
          {dependencies.length} {dependencies.length === 1 ? "dependency" : "dependencies"} · v{version}
        </span>
        {isOwner && (
          <button
            onClick={() => setShowAddForm((s) => !s)}
            className="flex items-center gap-1.5 font-mono text-[11px] text-accent hover:text-accent/80 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Add dependency
          </button>
        )}
      </div>

      {showAddForm && (
        <AddDependencyForm
          slug={plugin.slug}
          pluginId={plugin.id}
          version={version}
          onClose={() => setShowAddForm(false)}
        />
      )}

      {dependencies.length === 0 ? (
        <div className="border border-border-default bg-bg-elevated/30 p-8 text-center">
          <Package className="w-8 h-8 text-text-dim mx-auto mb-3" />
          <p className="font-mono text-xs text-text-dim">
            No dependencies declared for this version.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {dependencies.map((dep) => (
            <div
              key={dep.id}
              className="dep-card border border-border-default bg-bg-elevated/30 p-4 flex items-center justify-between transition-colors hover:border-border-hover"
            >
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 border border-border-hover flex items-center justify-center">
                  <Package className="text-text-dim w-[14px] h-[14px]" />
                </div>
                <div>
                  <div className="font-mono text-sm text-text-primary mb-0.5">
                    <Link
                      href={`/plugins/${dep.dependency_plugin.slug}`}
                      className="hover:text-accent transition-colors"
                    >
                      {dep.dependency_plugin.name}
                    </Link>{" "}
                    <span className="text-text-dim">{dep.version_req}</span>
                  </div>
                  <div className="font-mono text-[10px] text-text-dim">
                    {dep.is_optional && (
                      <span className="text-yellow-500 border border-yellow-500/20 bg-yellow-500/5 px-1.5 py-0.5 mr-2">
                        optional
                      </span>
                    )}
                    /{dep.dependency_plugin.slug}
                  </div>
                </div>
              </div>
              {isOwner && (
                <button
                  onClick={() => handleRemove(dep.id)}
                  disabled={isRemoving === dep.id}
                  className="text-text-dim hover:text-red-400 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isRemoving === dep.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <X className="w-4 h-4" />
                  )}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Add Dependency Form ───────────────────────────────────────────────────

function AddDependencyForm({
  slug,
  pluginId,
  version,
  onClose,
}: {
  readonly slug: string;
  readonly pluginId: string;
  readonly version: string;
  readonly onClose: () => void;
}) {
  const [dependencyPluginId, setDependencyPluginId] = useState("");
  const [versionReq, setVersionReq] = useState("^1.0.0");
  const [isOptional, setIsOptional] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedId = dependencyPluginId.trim();
    if (!trimmedId) {
      setError("Plugin ID is required");
      return;
    }

    if (trimmedId === pluginId) {
      setError("A plugin cannot depend on itself");
      return;
    }

    setIsSubmitting(true);
    try {
      await declareDependency(slug, version, {
        dependency_plugin_id: trimmedId,
        version_req: versionReq.trim(),
        is_optional: isOptional,
      });
      mutate(getDependenciesPath(slug, version));
      mutate(getDependencyGraphPath(slug, version));
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add dependency");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="border border-accent/30 bg-accent/5 p-5 mb-6 space-y-4"
    >
      <div className="font-mono text-[10px] text-accent uppercase tracking-widest">
        Declare dependency
      </div>

      {error && (
        <div className="flex items-center gap-2 font-mono text-[11px] text-red-400 bg-red-400/5 border border-red-400/20 px-3 py-2">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="dep-plugin-id" className="block font-mono text-[10px] text-text-dim uppercase tracking-wider mb-1.5">
            Plugin ID (UUID)
          </label>
          <input
            id="dep-plugin-id"
            type="text"
            value={dependencyPluginId}
            onChange={(e) => setDependencyPluginId(e.target.value)}
            placeholder="e.g. 550e8400-e29b-41d4-a716-..."
            className="w-full bg-bg-surface border border-border-default px-3 py-2 font-mono text-xs text-text-primary placeholder:text-text-dim/50 focus:border-accent focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="dep-version-req" className="block font-mono text-[10px] text-text-dim uppercase tracking-wider mb-1.5">
            Version requirement
          </label>
          <input
            id="dep-version-req"
            type="text"
            value={versionReq}
            onChange={(e) => setVersionReq(e.target.value)}
            placeholder="e.g. ^1.0.0 or >=1.2.0, <2.0.0"
            className="w-full bg-bg-surface border border-border-default px-3 py-2 font-mono text-xs text-text-primary placeholder:text-text-dim/50 focus:border-accent focus:outline-none"
          />
        </div>
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={isOptional}
          onChange={(e) => setIsOptional(e.target.checked)}
          className="accent-accent"
        />
        <span className="font-mono text-xs text-text-dim">Optional dependency</span>
      </label>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="font-mono text-[11px] text-black bg-accent hover:bg-accent/90 px-4 py-2 transition-colors cursor-pointer disabled:opacity-50"
        >
          {isSubmitting ? "Adding..." : "Add Dependency"}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="font-mono text-[11px] text-text-dim hover:text-text-primary transition-colors cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

// ── Dependency Graph View ─────────────────────────────────────────────────

function DependencyGraphView({
  slug,
  version,
}: {
  readonly slug: string;
  readonly version: string;
}) {
  const { data, isLoading } = useDependencyGraph(slug, version);

  if (isLoading) {
    return <DependencyListSkeleton />;
  }

  if (!data) {
    return (
      <div className="border border-border-default bg-bg-elevated/30 p-8 text-center">
        <p className="font-mono text-xs text-text-dim">Failed to load dependency graph.</p>
      </div>
    );
  }

  const { graph, conflicts } = data;

  return (
    <div className="space-y-6">
      {/* Conflict alerts */}
      {conflicts.length > 0 && <ConflictAlerts conflicts={conflicts} />}

      {/* Visual graph */}
      {graph.length === 0 ? (
        <div className="border border-border-default bg-bg-elevated/30 p-8 text-center">
          <GitBranch className="w-8 h-8 text-text-dim mx-auto mb-3" />
          <p className="font-mono text-xs text-text-dim">No dependencies to visualize.</p>
        </div>
      ) : (
        <DependencyTree graph={graph} rootSlug={slug} />
      )}
    </div>
  );
}

// ── Dependency Tree (graphical visualization) ─────────────────────────────

function DependencyTree({
  graph,
  rootSlug,
}: {
  readonly graph: DependencyGraphNode[];
  readonly rootSlug: string;
}) {
  const nodeMap = new Map(graph.map((n) => [n.plugin_slug, n]));
  const rootNode = nodeMap.get(rootSlug) ?? graph[0];

  if (!rootNode) return null;

  return (
    <div className="border border-border-default bg-bg-elevated/30 p-6 overflow-x-auto">
      <div className="font-mono text-xs text-text-muted uppercase tracking-widest mb-4">
        Dependency Tree
      </div>
      <TreeNode node={rootNode} nodeMap={nodeMap} depth={0} visited={new Set()} />
    </div>
  );
}

function TreeNode({
  node,
  nodeMap,
  depth,
  visited,
}: {
  readonly node: DependencyGraphNode;
  readonly nodeMap: Map<string, DependencyGraphNode>;
  readonly depth: number;
  readonly visited: Set<string>;
}) {
  const isCircular = visited.has(node.plugin_slug);
  const newVisited = new Set(visited);
  newVisited.add(node.plugin_slug);

  return (
    <div style={{ marginLeft: depth * 24 }}>
      {/* Node */}
      <div className="flex items-center gap-2 py-1.5">
        {depth > 0 && (
          <div className="flex items-center gap-1 text-border-hover">
            <div className="w-4 border-t border-border-hover" />
            <ArrowRight className="w-3 h-3" />
          </div>
        )}
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-text-primary font-bold">
            {node.plugin_name}
          </span>
          <span className="font-mono text-[10px] text-text-dim">
            v{node.version}
          </span>
        </div>
      </div>

      {/* Children */}
      {!isCircular &&
        node.dependencies.map((edge) => {
          const childNode = nodeMap.get(edge.dependency_plugin_slug);

          if (childNode) {
            return (
              <TreeNode
                key={edge.dependency_plugin_id}
                node={childNode}
                nodeMap={nodeMap}
                depth={depth + 1}
                visited={newVisited}
              />
            );
          }

          // Leaf dependency (no further deps resolved)
          return (
            <div
              key={edge.dependency_plugin_id}
              style={{ marginLeft: (depth + 1) * 24 }}
              className="flex items-center gap-2 py-1.5"
            >
              <div className="flex items-center gap-1 text-border-hover">
                <div className="w-4 border-t border-border-hover" />
                <ArrowRight className="w-3 h-3" />
              </div>
              <span className="font-mono text-xs text-text-primary">
                {edge.dependency_plugin_name}
              </span>
              <span className="font-mono text-[10px] text-text-dim">
                {edge.version_req}
              </span>
              {edge.resolved_version && (
                <span className="font-mono text-[10px] text-green-500">
                  → v{edge.resolved_version}
                </span>
              )}
              {!edge.is_compatible && (
                <span className="font-mono text-[9px] text-red-400 border border-red-400/20 bg-red-400/5 px-1.5 py-0.5">
                  UNRESOLVED
                </span>
              )}
              {edge.is_optional && (
                <span className="font-mono text-[9px] text-yellow-500 border border-yellow-500/20 bg-yellow-500/5 px-1.5 py-0.5">
                  optional
                </span>
              )}
            </div>
          );
        })}

      {isCircular && (
        <div
          style={{ marginLeft: (depth + 1) * 24 }}
          className="font-mono text-[10px] text-red-400 py-1"
        >
          ↻ circular reference
        </div>
      )}
    </div>
  );
}

// ── Conflict Alerts ───────────────────────────────────────────────────────

function ConflictAlerts({ conflicts }: { readonly conflicts: DependencyConflict[] }) {
  const conflictStyles: Record<string, { label: string; borderClass: string; textClass: string }> = {
    no_matching_version: { label: "No Match", borderClass: "border-red-400/30", textClass: "text-red-400" },
    incompatible_ranges: { label: "Incompatible", borderClass: "border-orange-400/30", textClass: "text-orange-400" },
    circular_dependency: { label: "Circular", borderClass: "border-red-500/30", textClass: "text-red-500" },
    inactive_plugin: { label: "Inactive", borderClass: "border-yellow-500/30", textClass: "text-yellow-500" },
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-red-400" />
        <span className="font-mono text-xs text-red-400 font-bold">
          {conflicts.length} {conflicts.length === 1 ? "conflict" : "conflicts"} detected
        </span>
      </div>

      {conflicts.map((conflict) => {
        const style = conflictStyles[conflict.conflict_type] ?? conflictStyles.no_matching_version;
        return (
          <div
            key={`${conflict.conflict_type}-${conflict.dependency_plugin_name}`}
            className={`border ${style.borderClass} bg-bg-elevated/30 p-4`}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className={`font-mono text-[10px] ${style.textClass} border ${style.borderClass} px-1.5 py-0.5 uppercase`}>
                {style.label}
              </span>
              <span className="font-mono text-xs text-text-primary">
                {conflict.dependency_plugin_name}
              </span>
            </div>
            <p className="font-mono text-[11px] text-text-dim">
              {conflict.details}
            </p>
          </div>
        );
      })}
    </div>
  );
}

// ── Dependants View ───────────────────────────────────────────────────────

function DependantsView({ slug }: { readonly slug: string }) {
  const { data, isLoading } = useDependants(slug);

  if (isLoading) {
    return <DependencyListSkeleton />;
  }

  const dependants = data?.dependants ?? [];

  return (
    <div>
      <div className="mb-4">
        <span className="font-mono text-xs text-text-dim">
          {dependants.length} {dependants.length === 1 ? "plugin depends" : "plugins depend"} on this plugin
        </span>
      </div>

      {dependants.length === 0 ? (
        <div className="border border-border-default bg-bg-elevated/30 p-8 text-center">
          <GitBranch className="w-8 h-8 text-text-dim mx-auto mb-3" />
          <p className="font-mono text-xs text-text-dim">
            No other plugins currently depend on this one.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {dependants.map((dep, index) => (
            <div
              key={`${dep.plugin_id}-${dep.version}-${index}`}
              className="dep-card border border-border-default bg-bg-elevated/30 p-4 flex items-center justify-between transition-colors hover:border-border-hover"
            >
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 border border-border-hover flex items-center justify-center">
                  <Package className="text-text-dim w-[14px] h-[14px]" />
                </div>
                <div>
                  <div className="font-mono text-sm text-text-primary mb-0.5">
                    <Link
                      href={`/plugins/${dep.plugin_slug}`}
                      className="hover:text-accent transition-colors"
                    >
                      {dep.plugin_name}
                    </Link>{" "}
                    <span className="text-text-dim">v{dep.version}</span>
                  </div>
                  <div className="font-mono text-[10px] text-text-dim">
                    requires {dep.version_req}
                    {dep.is_optional && (
                      <span className="text-yellow-500 ml-2">(optional)</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Dependency List Skeleton ──────────────────────────────────────────────

function DependencyListSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: 3 }, (_, i) => (
        <div
          key={`skeleton-dep-${i}`}
          className="border border-border-default bg-bg-elevated/30 p-4 flex items-center gap-4"
        >
          <div className="w-8 h-8 bg-bg-surface" />
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-bg-surface w-48" />
            <div className="h-2 bg-bg-surface w-32" />
          </div>
        </div>
      ))}
    </div>
  );
}
