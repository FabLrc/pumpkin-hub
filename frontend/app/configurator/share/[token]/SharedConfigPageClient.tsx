"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CopyPlus, Download, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Footer, Navbar } from "@/components/layout";
import { Button } from "@/components/ui";
import { createServerConfig, downloadPreview } from "@/lib/api";
import { useCurrentUser } from "@/lib/hooks";
import type { PluginSelection, ServerConfigResponse } from "@/lib/types";

interface SharedConfigPageClientProps {
  readonly config: ServerConfigResponse;
}

function parseApiError(error: unknown, fallback: string): string {
  if (!(error instanceof Error)) {
    return fallback;
  }

  const match = /"error":\s*"([^"]+)"/.exec(error.message);
  return match?.[1] ?? error.message ?? fallback;
}

function toPluginSelection(config: ServerConfigResponse): PluginSelection[] {
  return config.plugins.map((plugin) => ({
    plugin_id: plugin.plugin_id,
    version_id: plugin.version_id,
  }));
}

function toManualPluginSelection(config: ServerConfigResponse): PluginSelection[] {
  return config.plugins
    .filter((plugin) => !plugin.is_auto_dep)
    .map((plugin) => ({
      plugin_id: plugin.plugin_id,
      version_id: plugin.version_id,
    }));
}

function formatPlatform(platform: ServerConfigResponse["platform"]): string {
  if (platform === "linux") return "Linux";
  if (platform === "windows") return "Windows";
  return "macOS";
}

export function SharedConfigPageClient({ config }: SharedConfigPageClientProps) {
  const router = useRouter();
  const { data: user, isLoading: isLoadingUser } = useCurrentUser();

  const [isDownloading, setIsDownloading] = useState(false);
  const [isCloning, setIsCloning] = useState(false);

  const downloadSelections = useMemo(() => toPluginSelection(config), [config]);
  const cloneSelections = useMemo(() => toManualPluginSelection(config), [config]);

  const autoDepCount = useMemo(
    () => config.plugins.filter((plugin) => plugin.is_auto_dep).length,
    [config.plugins],
  );

  function redirectToLogin(): void {
    toast.error("Connexion requise pour cette action.");
    router.push("/auth/login");
  }

  async function handleDownload(): Promise<void> {
    if (!user) {
      redirectToLogin();
      return;
    }

    setIsDownloading(true);
    try {
      await downloadPreview({
        platform: config.platform,
        plugins: downloadSelections,
      });
      toast.success("Telechargement du ZIP lance.");
    } catch (error) {
      toast.error(parseApiError(error, "Telechargement impossible."));
    } finally {
      setIsDownloading(false);
    }
  }

  async function handleClone(): Promise<void> {
    if (!user) {
      redirectToLogin();
      return;
    }

    if (cloneSelections.length === 0) {
      toast.error("Aucun plugin manuel a cloner dans cette configuration.");
      return;
    }

    setIsCloning(true);
    try {
      const created = await createServerConfig({
        name: config.name,
        platform: config.platform,
        plugins: cloneSelections,
      });

      toast.success("Configuration clonee dans vos configs.");
      router.push(`/configurator?id=${created.id}`);
    } catch (error) {
      toast.error(parseApiError(error, "Clonage impossible."));
    } finally {
      setIsCloning(false);
    }
  }

  return (
    <>
      <Navbar />
      <main className="max-w-5xl mx-auto px-6 py-12">
        <Link
          href="/configurator"
          className="inline-flex items-center gap-2 text-xs font-mono text-text-dim hover:text-text-primary transition-colors mb-8"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to configurator
        </Link>

        <section className="border border-border-default bg-bg-elevated p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 bg-bg-surface border border-border-default px-2 py-1">
                <ShieldCheck className="w-3.5 h-3.5 text-accent" />
                <span className="font-mono text-[11px] uppercase tracking-widest text-text-muted">
                  Public shared config
                </span>
              </div>

              <h1 className="font-raleway font-bold text-2xl text-text-primary tracking-wide">
                {config.name}
              </h1>

              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2 py-1 border border-border-default font-mono text-[11px] text-text-secondary uppercase tracking-wider">
                  Platform: {formatPlatform(config.platform)}
                </span>
                <span className="px-2 py-1 border border-border-default font-mono text-[11px] text-text-secondary uppercase tracking-wider">
                  Plugins: {config.plugins.length}
                </span>
                {autoDepCount > 0 ? (
                  <span className="px-2 py-1 border border-accent/40 text-accent bg-accent/5 font-mono text-[11px] uppercase tracking-wider">
                    Auto deps: {autoDepCount}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="w-full sm:w-auto sm:min-w-[240px] space-y-3">
              <Button
                type="button"
                onClick={handleDownload}
                disabled={isLoadingUser || isDownloading || isCloning}
                className="w-full justify-center"
              >
                <Download className="w-3.5 h-3.5" />
                {isDownloading ? "Preparation..." : "Telecharger"}
              </Button>

              <Button
                type="button"
                variant="ghost"
                onClick={handleClone}
                disabled={isLoadingUser || isDownloading || isCloning}
                className="w-full justify-center"
              >
                <CopyPlus className="w-3.5 h-3.5" />
                {isCloning ? "Clonage..." : "Cloner dans mes configs"}
              </Button>

              {!isLoadingUser && !user ? (
                <p className="font-mono text-[11px] text-text-dim leading-relaxed">
                  Ces actions necessitent une connexion. Vous serez redirige vers
                  la page login.
                </p>
              ) : null}
            </div>
          </div>
        </section>

        <section className="mt-6 border border-border-default bg-bg-surface">
          <header className="px-4 py-3 border-b border-border-default">
            <h2 className="font-mono text-xs uppercase tracking-widest text-text-muted">
              Plugin Stack
            </h2>
          </header>

          <ul className="divide-y divide-border-default">
            {config.plugins.map((plugin) => (
              <li
                key={`${plugin.plugin_id}:${plugin.version_id}`}
                className="px-4 py-3 flex items-start justify-between gap-3"
              >
                <div>
                  <p className="font-raleway font-semibold text-sm text-text-primary">
                    {plugin.plugin_name}
                  </p>
                  <p className="font-mono text-[11px] text-text-dim mt-1">
                    {plugin.plugin_slug} - {plugin.version}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {plugin.is_auto_dep ? (
                    <span className="px-2 py-1 border border-accent/40 text-accent bg-accent/5 font-mono text-[10px] uppercase tracking-wider">
                      DEP
                    </span>
                  ) : (
                    <span className="px-2 py-1 border border-border-default text-text-muted font-mono text-[10px] uppercase tracking-wider">
                      Manual
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      </main>
      <Footer />
    </>
  );
}
