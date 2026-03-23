"use client";

import { useState, useEffect } from "react";
import {
  Github,
  RefreshCw,
  Search,
  Check,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { getCategoryIcon } from "@/lib/category-icons";
import { useCategories } from "@/lib/hooks";
import { listMyGithubRepos, publishPluginFromGithub } from "@/lib/api";
import type { MyGithubRepository } from "@/lib/types";

interface PublishFromGithubFormProps {
  onSuccess: (pluginSlug: string) => void;
  /** Auto-trigger repository loading on mount (e.g. after GitHub App installation redirect). */
  autoLoad?: boolean;
}

export function PublishFromGithubForm({ onSuccess, autoLoad }: PublishFromGithubFormProps) {
  const { data: categories } = useCategories();

  // Step 1 — repo picker
  const [repos, setRepos] = useState<MyGithubRepository[]>([]);
  const [repoSearch, setRepoSearch] = useState("");
  const [selectedRepo, setSelectedRepo] = useState<MyGithubRepository | null>(null);
  const [isLoadingRepos, setIsLoadingRepos] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  // Step 2 — metadata overrides
  const [pluginName, setPluginName] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);

  // Step 3 — sync options
  const [syncReadme, setSyncReadme] = useState(true);
  const [syncChangelog, setSyncChangelog] = useState(true);
  const [autoPublish, setAutoPublish] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (autoLoad) handleLoadRepos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredRepos = repos.filter((r) =>
    r.full_name.toLowerCase().includes(repoSearch.toLowerCase()),
  );

  async function handleLoadRepos() {
    setIsLoadingRepos(true);
    setSelectedRepo(null);
    setRepos([]);
    setPluginName("");
    setShortDescription("");
    try {
      const response = await listMyGithubRepos();
      setRepos(response.repositories);
      setHasLoaded(true);
      if (response.repositories.length === 0) {
        toast.info("No repositories found. Make sure the Pumpkin Hub GitHub App is installed on your account.");
      }
    } catch {
      toast.error("Could not load your repositories. Make sure your account is linked to GitHub.");
    } finally {
      setIsLoadingRepos(false);
    }
  }

  function handleSelectRepo(repo: MyGithubRepository) {
    setSelectedRepo(repo);
    setPluginName(repo.name.replace(/-/g, " "));
    setShortDescription(repo.description ?? "");
  }

  function toggleCategory(id: string) {
    setSelectedCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id].slice(0, 5),
    );
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!selectedRepo) {
      toast.error("Please select a repository");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await publishPluginFromGithub({
        installation_id: selectedRepo.installation_id,
        repository_owner: selectedRepo.owner,
        repository_name: selectedRepo.name,
        plugin_name: pluginName.trim() || undefined,
        short_description: shortDescription.trim() || undefined,
        category_ids: selectedCategoryIds.length > 0 ? selectedCategoryIds : undefined,
        sync_readme: syncReadme,
        sync_changelog: syncChangelog,
        auto_publish: autoPublish,
      });
      toast.success("Plugin published from GitHub!");
      onSuccess(result.plugin_slug);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to publish plugin from GitHub";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* ── Step 1: Load repositories ────────────────────────────────── */}
      <div>
        <label className="font-mono text-[10px] text-text-dim uppercase tracking-widest block mb-1.5">
          Step 1 — Select a GitHub Repository
        </label>

        {!hasLoaded ? (
          <>
            <button
              type="button"
              onClick={handleLoadRepos}
              disabled={isLoadingRepos}
              className="w-full font-mono text-xs border border-border-default hover:border-accent text-text-dim hover:text-text-primary px-4 py-3 transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
            >
              {isLoadingRepos ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Github className="w-3.5 h-3.5" />
              )}
              {isLoadingRepos ? "Loading your repositories..." : "Load my GitHub repositories"}
            </button>
            <p className="font-mono text-[10px] text-text-dim mt-1.5">
              Make sure the{" "}
              <a
                href="https://github.com/apps/pumpkin-hub-app"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline inline-flex items-center gap-0.5"
              >
                Pumpkin Hub GitHub App
                <ExternalLink className="w-2.5 h-2.5" />
              </a>{" "}
              is installed on your GitHub account.
            </p>
          </>
        ) : repos.length === 0 ? (
          <div className="border border-border-default p-4 text-center space-y-2">
            <p className="font-mono text-xs text-text-dim">
              No repositories found.
            </p>
            <p className="font-mono text-[10px] text-text-dim/70">
              Install the{" "}
              <a
                href="https://github.com/apps/pumpkin-hub-app"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline"
              >
                Pumpkin Hub GitHub App
              </a>{" "}
              on your GitHub account, then{" "}
              <button
                type="button"
                onClick={handleLoadRepos}
                className="text-accent hover:underline cursor-pointer"
              >
                retry
              </button>.
            </p>
          </div>
        ) : (
          <>
            {repos.length > 5 && (
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-text-dim/50" />
                <input
                  type="text"
                  value={repoSearch}
                  onChange={(e) => setRepoSearch(e.target.value)}
                  placeholder="Filter repositories..."
                  className="w-full font-mono text-xs bg-bg-base border border-border-default text-text-primary pl-8 pr-3 py-2 placeholder:text-text-dim/50 focus:border-accent focus:outline-none transition-colors"
                />
              </div>
            )}

            <div className="border border-border-default max-h-52 overflow-y-auto">
              {filteredRepos.length === 0 ? (
                <p className="font-mono text-[10px] text-text-dim p-3 text-center">
                  No repositories match your filter.
                </p>
              ) : (
                filteredRepos.map((repo) => (
                  <button
                    key={repo.full_name}
                    type="button"
                    onClick={() => handleSelectRepo(repo)}
                    className={`w-full text-left px-3 py-2.5 border-b border-border-default last:border-b-0 transition-colors cursor-pointer ${
                      selectedRepo?.full_name === repo.full_name
                        ? "bg-accent/10 border-l-2 border-l-accent"
                        : "hover:bg-bg-surface"
                    }`}
                  >
                    <div className="font-mono text-xs text-text-primary font-bold">
                      {repo.full_name}
                    </div>
                    {repo.description && (
                      <div className="font-mono text-[10px] text-text-dim mt-0.5 truncate">
                        {repo.description}
                      </div>
                    )}
                    <div className="font-mono text-[10px] text-text-dim/60 mt-0.5">
                      Branch: {repo.default_branch}
                    </div>
                  </button>
                ))
              )}
            </div>

            <button
              type="button"
              onClick={handleLoadRepos}
              disabled={isLoadingRepos}
              className="font-mono text-[10px] text-text-dim hover:text-accent transition-colors mt-1.5 cursor-pointer flex items-center gap-1"
            >
              <RefreshCw className={`w-2.5 h-2.5 ${isLoadingRepos ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </>
        )}
      </div>

      {/* ── Step 3: Plugin metadata overrides ───────────────────────── */}
      {selectedRepo && (
        <>
          <div className="border-t border-border-default pt-5 space-y-4">
            <p className="font-mono text-[10px] text-text-dim uppercase tracking-widest">
              Step 2 — Plugin Details (auto-filled from GitHub)
            </p>

            <div>
              <label className="font-mono text-[10px] text-text-dim uppercase tracking-widest block mb-1.5">
                Plugin Name
              </label>
              <input
                type="text"
                value={pluginName}
                onChange={(e) => setPluginName(e.target.value)}
                placeholder={selectedRepo.name}
                className="w-full font-mono text-xs bg-bg-base border border-border-default text-text-primary px-3 py-2.5 placeholder:text-text-dim/50 focus:border-accent focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label className="font-mono text-[10px] text-text-dim uppercase tracking-widest block mb-1.5">
                Short Description
              </label>
              <input
                type="text"
                value={shortDescription}
                onChange={(e) => setShortDescription(e.target.value)}
                placeholder={selectedRepo.description ?? "A brief description of your plugin…"}
                maxLength={255}
                className="w-full font-mono text-xs bg-bg-base border border-border-default text-text-primary px-3 py-2.5 placeholder:text-text-dim/50 focus:border-accent focus:outline-none transition-colors"
              />
            </div>

            {/* Categories */}
            {categories && categories.length > 0 && (
              <div>
                <label className="font-mono text-[10px] text-text-dim uppercase tracking-widest block mb-1.5">
                  Categories{" "}
                  <span className="text-text-dim/60">
                    ({selectedCategoryIds.length}/5)
                  </span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {categories.map((cat) => {
                    const isSelected = selectedCategoryIds.includes(cat.id);
                    const Icon = getCategoryIcon(cat.icon);
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => toggleCategory(cat.id)}
                        disabled={!isSelected && selectedCategoryIds.length >= 5}
                        title={cat.description ?? undefined}
                        className={`font-mono text-[10px] px-2.5 py-1.5 border transition-colors cursor-pointer disabled:opacity-40 inline-flex items-center gap-1 ${
                          isSelected
                            ? "border-accent bg-accent/10 text-accent"
                            : "border-border-default text-text-dim hover:border-accent/50"
                        }`}
                      >
                        {isSelected ? <Check className="w-2.5 h-2.5" /> : <Icon className="w-2.5 h-2.5" />}
                        {cat.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Sync / publish options */}
            <div>
              <label className="font-mono text-[10px] text-text-dim uppercase tracking-widest block mb-2">
                GitHub Sync Options
              </label>
              <div className="grid grid-cols-3 gap-3">
                <SyncToggle label="Auto-publish" checked={autoPublish} onChange={setAutoPublish} />
                <SyncToggle label="Sync README" checked={syncReadme} onChange={setSyncReadme} />
                <SyncToggle
                  label="Sync Changelog"
                  checked={syncChangelog}
                  onChange={setSyncChangelog}
                />
              </div>
              <p className="font-mono text-[10px] text-text-dim mt-2 leading-relaxed">
                <strong className="text-text-primary">Auto-publish</strong> creates a new version
                on each GitHub Release. Attach{" "}
                <span className="text-accent">linux</span>,{" "}
                <span className="text-accent">windows</span> and{" "}
                <span className="text-accent">macos</span> binaries to your releases.
              </p>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full font-mono text-sm bg-accent hover:bg-accent-hover text-bg-base font-bold px-4 py-3 transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Github className="w-4 h-4" />
            )}
            {isSubmitting ? "Publishing…" : `Publish from ${selectedRepo.full_name}`}
          </button>
        </>
      )}
    </form>
  );
}

// ── Sync Toggle ───────────────────────────────────────────────────────────

function SyncToggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`border p-2.5 text-center transition-colors cursor-pointer ${
        checked ? "border-accent/30 bg-accent/5" : "border-border-default bg-bg-base"
      }`}
    >
      <div
        className={`w-2 h-2 mx-auto mb-1.5 ${checked ? "bg-accent" : "bg-border-default"}`}
      />
      <div className="font-mono text-[10px] text-text-dim">{label}</div>
    </button>
  );
}
