"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Copy,
  Monitor,
  Pencil,
  Plus,
  RefreshCw,
  Terminal,
  Trash2,
  Wrench,
  Laptop,
} from "lucide-react";
import { toast } from "sonner";
import { Footer, Navbar } from "@/components/layout";
import { Button } from "@/components/ui";
import { deleteServerConfig, rotateShareToken } from "@/lib/api";
import { useCurrentUser, useServerConfigs } from "@/lib/hooks";
import type { ServerConfigPlatform, ServerConfigSummary } from "@/lib/types";

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function parseApiError(error: unknown, fallback: string): string {
  if (!(error instanceof Error)) {
    return fallback;
  }

  const match = /"error":\s*"([^"]+)"/.exec(error.message);
  return match?.[1] ?? error.message ?? fallback;
}

function getShareUrl(shareToken: string): string {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (typeof window !== "undefined" ? window.location.origin : "");

  const normalizedBaseUrl = baseUrl.replace(/\/$/, "");
  return `${normalizedBaseUrl}/configurator/share/${shareToken}`;
}

function PlatformChip({ platform }: { platform: ServerConfigPlatform }) {
  if (platform === "windows") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-1 border border-border-default font-mono text-[11px] uppercase tracking-wider text-text-secondary">
        <Monitor className="w-3 h-3" />
        Windows
      </span>
    );
  }

  if (platform === "macos") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-1 border border-border-default font-mono text-[11px] uppercase tracking-wider text-text-secondary">
        <Laptop className="w-3 h-3" />
        macOS
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-1 border border-border-default font-mono text-[11px] uppercase tracking-wider text-text-secondary">
      <Terminal className="w-3 h-3" />
      Linux
    </span>
  );
}

export default function DashboardConfiguratorPage() {
  const router = useRouter();
  const { data: user, isLoading: isLoadingUser } = useCurrentUser();
  const { configs, isLoading, error, mutate } = useServerConfigs();

  const [revokingConfigId, setRevokingConfigId] = useState<string | null>(null);
  const [isCopyingConfigId, setIsCopyingConfigId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ServerConfigSummary | null>(
    null,
  );
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!isLoadingUser && !user) {
      router.replace("/auth/login");
    }
  }, [isLoadingUser, router, user]);

  const canRender = useMemo(() => isLoadingUser || Boolean(user), [isLoadingUser, user]);

  async function handleCopyShareLink(config: ServerConfigSummary): Promise<void> {
    if (!navigator.clipboard?.writeText) {
      toast.error("Clipboard API unavailable in this browser.");
      return;
    }

    setIsCopyingConfigId(config.id);
    try {
      await navigator.clipboard.writeText(getShareUrl(config.share_token));
      toast.success("Share link copied.");
    } catch (error) {
      toast.error(parseApiError(error, "Failed to copy share link."));
    } finally {
      setIsCopyingConfigId(null);
    }
  }

  async function handleRotateShareToken(configId: string): Promise<void> {
    setRevokingConfigId(configId);
    try {
      await rotateShareToken(configId);
      await mutate();
      toast.success("Share link rotated.");
    } catch (error) {
      toast.error(parseApiError(error, "Unable to rotate share link."));
    } finally {
      setRevokingConfigId(null);
    }
  }

  async function handleConfirmDelete(): Promise<void> {
    if (!deleteTarget) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteServerConfig(deleteTarget.id);
      await mutate();
      toast.success(`Configuration "${deleteTarget.name}" deleted.`);
      setDeleteTarget(null);
    } catch (error) {
      toast.error(parseApiError(error, "Delete failed."));
    } finally {
      setIsDeleting(false);
    }
  }

  if (!canRender) {
    return null;
  }

  return (
    <>
      <Navbar />
      <main className="max-w-6xl mx-auto px-6 py-12">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-xs font-mono text-text-dim hover:text-text-primary transition-colors mb-8"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to dashboard
        </Link>

        <header className="mb-8 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-accent flex items-center justify-center">
                <Wrench className="w-5 h-5 text-black" />
              </div>
              <h1 className="font-raleway font-bold text-2xl text-text-primary tracking-wide">
                Server Configurator
              </h1>
            </div>
            <p className="font-mono text-xs text-text-dim max-w-2xl">
              Manage saved server bundles, copy share links, revoke public access,
              or jump back into the editor.
            </p>
          </div>

          <Button href="/configurator">
            <Plus className="w-3.5 h-3.5" />
            New Configuration
          </Button>
        </header>

        <div className="border border-border-default bg-bg-elevated">
          <div className="px-6 py-4 border-b border-border-default flex items-center justify-between">
            <h2 className="font-raleway font-bold text-sm text-text-primary tracking-wide uppercase">
              Saved Configurations
            </h2>
            <span className="font-mono text-xs text-text-muted">
              {configs.length} {configs.length === 1 ? "config" : "configs"}
            </span>
          </div>

          {isLoading ? (
            <div className="p-6 space-y-3">
              {[
                "sk-config-row-a",
                "sk-config-row-b",
                "sk-config-row-c",
              ].map((skeletonKey) => (
                <div
                  key={skeletonKey}
                  className="h-20 bg-bg-surface border border-border-default animate-pulse"
                />
              ))}
            </div>
          ) : error ? (
            <div className="p-6">
              <p className="font-mono text-xs text-error">
                Failed to load saved configurations.
              </p>
            </div>
          ) : configs.length === 0 ? (
            <div className="p-12 text-center">
              <Wrench className="w-10 h-10 text-text-dim mx-auto mb-4" />
              <p className="font-mono text-sm text-text-muted mb-2">
                No server configurations yet
              </p>
              <p className="font-mono text-xs text-text-dim mb-6 max-w-sm mx-auto">
                Build your first portable Pumpkin server bundle and share it with
                your team.
              </p>
              <Button href="/configurator" className="justify-center">
                <Plus className="w-3.5 h-3.5" />
                Open Configurator
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border-default">
              {configs.map((config) => (
                <article
                  key={config.id}
                  className="px-6 py-4 flex items-start justify-between gap-4 flex-wrap"
                >
                  <div className="min-w-[280px] flex-1">
                    <h3 className="font-raleway font-bold text-sm text-text-primary">
                      {config.name}
                    </h3>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <PlatformChip platform={config.platform} />
                      <span className="inline-flex items-center px-2 py-1 border border-border-default font-mono text-[11px] uppercase tracking-wider text-text-secondary">
                        Plugins: {config.plugin_count}
                      </span>
                      <span className="inline-flex items-center px-2 py-1 border border-border-default font-mono text-[11px] uppercase tracking-wider text-text-secondary">
                        Created: {formatDate(config.created_at)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    <Link
                      href={`/configurator?id=${config.id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-border-default text-text-muted hover:text-text-primary hover:border-border-hover transition-colors font-mono text-xs uppercase tracking-wider"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      Edit
                    </Link>

                    <button
                      type="button"
                      onClick={() => handleCopyShareLink(config)}
                      disabled={isCopyingConfigId === config.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-border-default text-text-muted hover:text-text-primary hover:border-border-hover transition-colors font-mono text-xs uppercase tracking-wider cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      {isCopyingConfigId === config.id ? "Copying" : "Copy Link"}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRotateShareToken(config.id)}
                      disabled={revokingConfigId === config.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-border-default text-text-muted hover:text-text-primary hover:border-border-hover transition-colors font-mono text-xs uppercase tracking-wider cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      {revokingConfigId === config.id ? "Revoking" : "Revoke"}
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeleteTarget(config)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-danger/40 text-danger hover:bg-danger/10 transition-colors font-mono text-xs uppercase tracking-wider cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </main>

      {deleteTarget && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center px-4"
        >
          <div className="w-full max-w-md border border-border-default bg-bg-elevated p-5">
            <h2 className="font-raleway font-bold text-lg text-text-primary mb-2">
              Delete configuration
            </h2>
            <p className="font-mono text-xs text-text-dim leading-relaxed mb-5">
              You are about to permanently remove configuration {deleteTarget.name}. This action
              cannot be undone.
            </p>
            <div className="flex items-center gap-3 justify-end">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="!bg-danger !text-white hover:!bg-danger/80"
              >
                {isDeleting ? "Deleting..." : "Confirm delete"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </>
  );
}
