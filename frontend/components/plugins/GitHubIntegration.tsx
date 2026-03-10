"use client";

import { useState } from "react";
import { Github, Unlink, Copy, Check, RefreshCw, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { mutate } from "swr";
import { useGithubLink } from "@/lib/hooks";
import { linkGithub, unlinkGithub, getGithubLinkPath, getPluginBadgeUrl } from "@/lib/api";
import type { LinkGitHubRequest } from "@/lib/types";

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
        <div className="font-mono text-[10px] text-text-dim uppercase tracking-widest mb-2">
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

// ── Unlinked State (Link Form) ────────────────────────────────────────────

function UnlinkedState({ slug }: { slug: string }) {
  const [installationId, setInstallationId] = useState("");
  const [repoOwner, setRepoOwner] = useState("");
  const [repoName, setRepoName] = useState("");
  const [syncReadme, setSyncReadme] = useState(true);
  const [syncChangelog, setSyncChangelog] = useState(true);
  const [autoPublish, setAutoPublish] = useState(true);
  const [isLinking, setIsLinking] = useState(false);

  async function handleLink(event: React.FormEvent) {
    event.preventDefault();

    const parsedInstallationId = Number(installationId);
    if (!parsedInstallationId || parsedInstallationId <= 0) {
      toast.error("Installation ID must be a positive number");
      return;
    }
    if (!repoOwner.trim() || !repoName.trim()) {
      toast.error("Repository owner and name are required");
      return;
    }

    setIsLinking(true);
    try {
      const body: LinkGitHubRequest = {
        installation_id: parsedInstallationId,
        repository_owner: repoOwner.trim(),
        repository_name: repoName.trim(),
        sync_readme: syncReadme,
        sync_changelog: syncChangelog,
        auto_publish: autoPublish,
      };
      await linkGithub(slug, body);
      await mutate(getGithubLinkPath(slug), undefined, { revalidate: true });
      toast.success("Repository linked successfully");
    } catch {
      toast.error("Failed to link repository. Make sure the GitHub App is installed.");
    } finally {
      setIsLinking(false);
    }
  }

  return (
    <form onSubmit={handleLink} className="space-y-4">
      <p className="font-mono text-xs text-text-dim leading-relaxed">
        Install the{" "}
        <span className="text-accent">Pumpkin Hub GitHub App</span>{" "}
        on your repository, then enter the details below to enable
        auto-publishing on release and content synchronization.
      </p>

      {/* Installation ID */}
      <div>
        <label className="font-mono text-[10px] text-text-dim uppercase tracking-widest block mb-1.5">
          Installation ID
        </label>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={installationId}
          onChange={(e) => setInstallationId(e.target.value)}
          placeholder="12345678"
          required
          className="w-full font-mono text-xs bg-bg-base border border-border-default text-text-primary px-3 py-2.5 placeholder:text-text-dim/50 focus:border-accent focus:outline-none transition-colors"
        />
      </div>

      {/* Repository */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="font-mono text-[10px] text-text-dim uppercase tracking-widest block mb-1.5">
            Owner
          </label>
          <input
            type="text"
            value={repoOwner}
            onChange={(e) => setRepoOwner(e.target.value)}
            placeholder="my-org"
            required
            className="w-full font-mono text-xs bg-bg-base border border-border-default text-text-primary px-3 py-2.5 placeholder:text-text-dim/50 focus:border-accent focus:outline-none transition-colors"
          />
        </div>
        <div>
          <label className="font-mono text-[10px] text-text-dim uppercase tracking-widest block mb-1.5">
            Repository
          </label>
          <input
            type="text"
            value={repoName}
            onChange={(e) => setRepoName(e.target.value)}
            placeholder="my-plugin"
            required
            className="w-full font-mono text-xs bg-bg-base border border-border-default text-text-primary px-3 py-2.5 placeholder:text-text-dim/50 focus:border-accent focus:outline-none transition-colors"
          />
        </div>
      </div>

      {/* Toggle options */}
      <div className="grid grid-cols-3 gap-3">
        <ToggleOption label="Auto-publish" checked={autoPublish} onChange={setAutoPublish} />
        <ToggleOption label="Sync README" checked={syncReadme} onChange={setSyncReadme} />
        <ToggleOption label="Sync Changelog" checked={syncChangelog} onChange={setSyncChangelog} />
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
        {isLinking ? "Linking..." : "Connect Repository"}
      </button>
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
