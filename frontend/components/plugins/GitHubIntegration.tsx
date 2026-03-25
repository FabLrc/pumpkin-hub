"use client";

import { useState } from "react";
import {
  Github,
  Unlink,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { mutate } from "swr";
import { useGithubLink } from "@/lib/hooks";
import {
  linkGithub,
  unlinkGithub,
  getGithubLinkPath,
  getPluginBadgeUrl,
  listMyGithubRepos,
} from "@/lib/api";
import type { MyGithubRepository, LinkGitHubRequest } from "@/lib/types";

// ── Props ─────────────────────────────────────────────────────────────────

interface GitHubIntegrationProps {
  slug: string;
}

export function GitHubIntegration({ slug }: GitHubIntegrationProps) {
  const { data: link, error, isLoading } = useGithubLink(slug);
  const isLinked = !error && !!link;

  if (isLoading) {
    return <IntegrationSkeleton />;
  }

  return (
    <section className="border border-border-default bg-bg-elevated/30 p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-8 h-8 bg-[#24292f] flex items-center justify-center">
          <Github className="w-4 h-4 text-white" />
        </div>
        <div>
          <h2 className="font-raleway font-bold text-base text-text-primary">
            GitHub Integration
          </h2>
          <p className="font-mono text-[10px] text-text-dim">
            Link a repository for auto-publishing & sync
          </p>
        </div>
      </div>

      {isLinked ? (
        <LinkedState slug={slug} link={link} />
      ) : (
        <UnlinkedState slug={slug} />
      )}
    </section>
  );
}

// ── Linked State ──────────────────────────────────────────────────────────

function LinkedState({
  slug,
  link,
}: {
  slug: string;
  link: NonNullable<ReturnType<typeof useGithubLink>["data"]>;
}) {
  const [isUnlinking, setIsUnlinking] = useState(false);
  const [badgeCopied, setBadgeCopied] = useState(false);

  const badgeUrl = getPluginBadgeUrl(slug);
  const badgeMarkdown = `[![Download on Pumpkin Hub](${badgeUrl})](https://pumpkin-hub.dev/plugins/${slug})`;

  async function handleUnlink() {
    setIsUnlinking(true);
    try {
      await unlinkGithub(slug);
      await mutate(getGithubLinkPath(slug), undefined, { revalidate: true });
      toast.success("Repository unlinked successfully");
    } catch {
      toast.error("Failed to unlink repository");
    } finally {
      setIsUnlinking(false);
    }
  }

  async function handleCopyBadge() {
    await navigator.clipboard.writeText(badgeMarkdown);
    setBadgeCopied(true);
    toast.success("Badge markdown copied to clipboard");
    setTimeout(() => setBadgeCopied(false), 2000);
  }

  return (
    <div className="space-y-5">
      {/* Connected repo info */}
      <div className="border border-accent/20 bg-accent/5 p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="font-mono text-[10px] text-accent uppercase tracking-widest">
            Connected Repository
          </span>
          <a
            href={`https://github.com/${link.repository_full_name}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-[10px] text-text-dim hover:text-accent transition-colors flex items-center gap-1"
          >
            View on GitHub
            <ExternalLink className="w-2.5 h-2.5" />
          </a>
        </div>
        <div className="font-mono text-sm text-text-primary font-bold">
          {link.repository_full_name}
        </div>
        <div className="font-mono text-[10px] text-text-dim mt-1">
          Branch: {link.default_branch}
        </div>
      </div>

      {/* Features status */}
      <div className="grid grid-cols-3 gap-3">
        <FeatureIndicator label="Auto-publish" enabled={link.auto_publish} />
        <FeatureIndicator label="Sync README" enabled={link.sync_readme} />
        <FeatureIndicator label="Sync Changelog" enabled={link.sync_changelog} />
      </div>

      {/* Badge preview & copy */}
      <div>
        <div className="font-mono text-xs text-text-muted uppercase tracking-widest mb-2">
          Badge
        </div>
        <div className="border border-border-default bg-bg-base p-3 flex items-center justify-between gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={badgeUrl} alt="Pumpkin Hub badge" height={20} />
          <button
            onClick={handleCopyBadge}
            className="font-mono text-[10px] text-text-dim hover:text-accent transition-colors flex items-center gap-1 flex-shrink-0 cursor-pointer"
          >
            {badgeCopied ? (
              <>
                <Check className="w-3 h-3 text-accent" />
                Copied
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                Copy Markdown
              </>
            )}
          </button>
        </div>
      </div>

      {/* Unlink button */}
      <button
        onClick={handleUnlink}
        disabled={isUnlinking}
        className="w-full font-mono text-xs border border-red-500/30 text-red-400 hover:bg-red-500/10 px-4 py-2.5 transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
      >
        {isUnlinking ? (
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Unlink className="w-3.5 h-3.5" />
        )}
        {isUnlinking ? "Unlinking..." : "Disconnect Repository"}
      </button>
    </div>
  );
}

// ── Feature Indicator ─────────────────────────────────────────────────────

function FeatureIndicator({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <div className="border border-border-default p-2.5 text-center">
      <div
        className={`w-2 h-2 mx-auto mb-1.5 ${
          enabled ? "bg-accent" : "bg-border-default"
        }`}
      />
      <div className="font-mono text-[10px] text-text-dim">{label}</div>
      <div className={`font-mono text-[10px] font-bold ${enabled ? "text-accent" : "text-text-dim"}`}>
        {enabled ? "ON" : "OFF"}
      </div>
    </div>
  );
}

// ── Unlinked State (Link Form with Repo Picker) ────────────────────────────

function UnlinkedState({ slug }: { slug: string }) {
  const [repos, setRepos] = useState<MyGithubRepository[]>([]);
  const [repoSearch, setRepoSearch] = useState("");
  const [selectedRepo, setSelectedRepo] = useState<MyGithubRepository | null>(null);
  const [isLoadingRepos, setIsLoadingRepos] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [syncReadme, setSyncReadme] = useState(true);
  const [syncChangelog, setSyncChangelog] = useState(true);
  const [autoPublish, setAutoPublish] = useState(true);
  const [isLinking, setIsLinking] = useState(false);

  const filteredRepos = repos.filter((r) =>
    r.full_name.toLowerCase().includes(repoSearch.toLowerCase()),
  );

  async function handleLoadRepos() {
    setIsLoadingRepos(true);
    setSelectedRepo(null);
    setRepos([]);
    try {
      const response = await listMyGithubRepos();
      setRepos(response.repositories);
      setHasLoaded(true);
      if (response.repositories.length === 0) {
        toast.info("No repositories found. Make sure the Pumpkin Hub GitHub App is installed.");
      }
    } catch {
      toast.error(
        "Could not load repositories. Make sure your account is linked to GitHub.",
      );
    } finally {
      setIsLoadingRepos(false);
    }
  }

  async function handleLink(event: React.FormEvent) {
    event.preventDefault();

    if (!selectedRepo) {
      toast.error("Please select a repository");
      return;
    }

    setIsLinking(true);
    try {
      const body: LinkGitHubRequest = {
        installation_id: selectedRepo.installation_id,
        repository_owner: selectedRepo.owner,
        repository_name: selectedRepo.name,
        sync_readme: syncReadme,
        sync_changelog: syncChangelog,
        auto_publish: autoPublish,
      };
      await linkGithub(slug, body);
      await mutate(getGithubLinkPath(slug), undefined, { revalidate: true });
      toast.success("Repository linked successfully");
    } catch {
      toast.error("Failed to link repository. Check the repository access and try again.");
    } finally {
      setIsLinking(false);
    }
  }

  return (
    <form onSubmit={handleLink} className="space-y-4">
      <p className="font-mono text-xs text-text-dim leading-relaxed">
        Install the{" "}
        <a
          href="https://github.com/apps/pumpkin-hub-app"
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent hover:underline"
        >
          Pumpkin Hub GitHub App
        </a>{" "}
        on your repository to enable auto-publishing on release and content synchronization.
      </p>

      {/* Step 1 — Load repositories */}
      {!hasLoaded ? (
        <div>
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
            {isLoadingRepos ? "Loading..." : "Load my GitHub repositories"}
          </button>
          <p className="font-mono text-[10px] text-text-dim mt-1.5">
            Make sure the{" "}
            <a
              href="https://github.com/apps/pumpkin-hub-app"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              Pumpkin Hub GitHub App
            </a>{" "}
            is installed on your GitHub account.
          </p>
        </div>
      ) : null}

      {/* Empty state */}
      {hasLoaded && repos.length === 0 && (
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
      )}

      {/* Repository picker */}
      {hasLoaded && repos.length > 0 && (
        <div>
          <label className="font-mono text-xs text-text-muted uppercase tracking-widest block mb-1.5">
            Select Repository
          </label>

          {repos.length > 5 && (
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-text-dim/50" />
              <input
                type="text"
                value={repoSearch}
                onChange={(e) => setRepoSearch(e.target.value)}
                placeholder="Filter repositories…"
                className="w-full font-mono text-xs bg-bg-base border border-border-default text-text-primary pl-8 pr-3 py-2 placeholder:text-text-dim/50 focus:border-accent focus:outline-none transition-colors"
              />
            </div>
          )}

          <div className="border border-border-default max-h-48 overflow-y-auto">
            {filteredRepos.length === 0 ? (
              <p className="font-mono text-[10px] text-text-dim p-3 text-center">
                No repositories match your filter.
              </p>
            ) : (
              filteredRepos.map((repo) => (
                <button
                  key={repo.full_name}
                  type="button"
                  onClick={() => setSelectedRepo(repo)}
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

          {selectedRepo && (
            <div className="flex items-center gap-2 mt-2 p-2 bg-accent/5 border border-accent/20">
              <Check className="w-3 h-3 text-accent flex-shrink-0" />
              <span className="font-mono text-[10px] text-accent">
                Selected: {selectedRepo.full_name}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Step 3 — Options (only shown once a repo is selected) */}
      {selectedRepo && (
        <>
          <div>
            <label className="font-mono text-xs text-text-muted uppercase tracking-widest block mb-2">
              Sync Features
            </label>
            <div className="grid grid-cols-3 gap-3">
              <ToggleOption label="Auto-publish" checked={autoPublish} onChange={setAutoPublish} />
              <ToggleOption label="Sync README" checked={syncReadme} onChange={setSyncReadme} />
              <ToggleOption
                label="Sync Changelog"
                checked={syncChangelog}
                onChange={setSyncChangelog}
              />
            </div>
            <p className="font-mono text-[10px] text-text-dim mt-2 leading-relaxed">
              <strong className="text-text-primary">Auto-publish</strong> — Creates a version on
              each GitHub Release (needs linux + windows + macos binaries attached).
            </p>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isLinking}
            className="w-full font-mono text-xs bg-accent hover:bg-accent-hover text-bg-base font-bold px-4 py-2.5 transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isLinking ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Github className="w-3.5 h-3.5" />
            )}
            {isLinking ? "Linking..." : `Connect ${selectedRepo.full_name}`}
          </button>
        </>
      )}
    </form>
  );
}

// ── Toggle Option ─────────────────────────────────────────────────────────

function ToggleOption({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`border p-2.5 text-center transition-colors cursor-pointer ${
        checked
          ? "border-accent/30 bg-accent/5"
          : "border-border-default bg-bg-base"
      }`}
    >
      <div
        className={`w-2 h-2 mx-auto mb-1.5 ${
          checked ? "bg-accent" : "bg-border-default"
        }`}
      />
      <div className="font-mono text-[10px] text-text-dim">{label}</div>
    </button>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────

function IntegrationSkeleton() {
  return (
    <section className="border border-border-default bg-bg-elevated/30 p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-8 h-8 bg-bg-surface animate-pulse" />
        <div className="space-y-1.5">
          <div className="w-36 h-4 bg-bg-surface animate-pulse" />
          <div className="w-52 h-2.5 bg-bg-surface animate-pulse" />
        </div>
      </div>
      <div className="space-y-3">
        <div className="w-full h-10 bg-bg-surface animate-pulse" />
        <div className="w-full h-10 bg-bg-surface animate-pulse" />
      </div>
    </section>
  );
}
