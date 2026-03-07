"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  LayoutDashboard,
  Package,
  Download,
  Plus,
  Pencil,
  ExternalLink,
} from "lucide-react";
import { Navbar, Footer } from "@/components/layout";
import { useCurrentUser, useAuthorPlugins } from "@/lib/hooks";
import type { PluginSummary } from "@/lib/types";

function formatDownloads(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000)
    return `${(count / 1_000).toFixed(0).replace(/\.0$/, "")}k`;
  return String(count);
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function DashboardPage() {
  const router = useRouter();
  const { data: user, isLoading: isLoadingUser } = useCurrentUser();
  const { data: pluginsData, isLoading: isLoadingPlugins } = useAuthorPlugins(
    user?.username ?? null,
  );

  // Redirect unauthenticated users
  if (!isLoadingUser && !user) {
    router.replace("/auth");
    return null;
  }

  const plugins = pluginsData?.data ?? [];
  const totalDownloads = plugins.reduce(
    (sum, p) => sum + p.downloads_total,
    0,
  );
  const isLoading = isLoadingUser || isLoadingPlugins;

  return (
    <>
      <Navbar />
      <main className="max-w-5xl mx-auto px-6 py-12">
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-mono text-text-dim hover:text-text-primary transition-colors mb-8"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to home
        </Link>

        {/* Header */}
        <div className="flex items-start justify-between mb-10">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-accent flex items-center justify-center">
                <LayoutDashboard className="w-5 h-5 text-black" />
              </div>
              <h1 className="font-raleway font-bold text-2xl text-text-primary tracking-wide">
                Creator Dashboard
              </h1>
            </div>
            <p className="font-mono text-xs text-text-dim max-w-lg">
              Manage your published plugins and track their performance.
            </p>
          </div>
          <Link
            href="/plugins/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-accent text-black font-mono text-xs font-bold tracking-wider uppercase hover:bg-accent-light transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" />
            Publish Plugin
          </Link>
        </div>

        {/* Stats */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-24 bg-bg-surface border border-border-default animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
            <StatCard
              icon={<Package className="w-5 h-5" />}
              label="Published Plugins"
              value={String(plugins.length)}
            />
            <StatCard
              icon={<Download className="w-5 h-5" />}
              label="Total Downloads"
              value={formatDownloads(totalDownloads)}
            />
            <StatCard
              icon={<LayoutDashboard className="w-5 h-5" />}
              label="Member Since"
              value={user ? formatDate(user.created_at) : "—"}
            />
          </div>
        )}

        {/* Plugins Table */}
        <div className="border border-border-default bg-bg-elevated">
          <div className="px-6 py-4 border-b border-border-default flex items-center justify-between">
            <h2 className="font-raleway font-bold text-sm text-text-primary tracking-wide uppercase">
              Your Plugins
            </h2>
            <span className="font-mono text-[10px] text-text-dim">
              {plugins.length} {plugins.length === 1 ? "plugin" : "plugins"}
            </span>
          </div>

          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-16 bg-bg-surface border border-border-default animate-pulse"
                />
              ))}
            </div>
          ) : plugins.length === 0 ? (
            <div className="p-12 text-center">
              <Package className="w-10 h-10 text-text-dim mx-auto mb-4" />
              <p className="font-mono text-sm text-text-muted mb-2">
                No plugins yet
              </p>
              <p className="font-mono text-xs text-text-dim mb-6 max-w-sm mx-auto">
                Share your first creation with the Pumpkin MC community.
              </p>
              <Link
                href="/plugins/new"
                className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-black font-mono text-xs font-bold tracking-wider uppercase hover:bg-accent-light transition-colors"
              >
                <Plus className="w-4 h-4" />
                Publish Your First Plugin
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-border-default">
              {plugins.map((plugin) => (
                <PluginRow key={plugin.id} plugin={plugin} />
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="border border-border-default bg-bg-elevated p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-accent">{icon}</span>
        <span className="font-mono text-[10px] text-text-dim uppercase tracking-wider">
          {label}
        </span>
      </div>
      <div className="font-mono text-2xl font-bold text-text-primary">
        {value}
      </div>
    </div>
  );
}

function PluginRow({ plugin }: { plugin: PluginSummary }) {
  return (
    <div className="px-6 py-4 flex items-center gap-4">
      {/* Icon */}
      <div className="w-9 h-9 bg-bg-surface border border-border-hover flex items-center justify-center shrink-0">
        <span className="font-mono font-bold text-[10px] text-text-subtle">
          {plugin.name.slice(0, 2).toUpperCase()}
        </span>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <Link
          href={`/plugins/${plugin.slug}`}
          className="font-raleway font-bold text-sm text-text-primary hover:text-accent transition-colors"
        >
          {plugin.name}
        </Link>
        <div className="font-mono text-[10px] text-text-dim mt-0.5 flex items-center gap-3">
          <span>Created {formatDate(plugin.created_at)}</span>
          {plugin.categories.length > 0 && (
            <span>
              {plugin.categories.map((c) => `#${c.slug}`).join(" ")}
            </span>
          )}
        </div>
      </div>

      {/* Downloads */}
      <div className="text-right shrink-0 mr-4">
        <div className="font-mono text-sm font-bold text-text-primary">
          {formatDownloads(plugin.downloads_total)}
        </div>
        <div className="font-mono text-[10px] text-text-dim">downloads</div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        <Link
          href={`/plugins/${plugin.slug}/edit`}
          className="p-2 text-text-dim hover:text-accent hover:bg-bg-surface transition-colors"
          title="Edit plugin"
        >
          <Pencil className="w-3.5 h-3.5" />
        </Link>
        <Link
          href={`/plugins/${plugin.slug}`}
          className="p-2 text-text-dim hover:text-text-primary hover:bg-bg-surface transition-colors"
          title="View plugin"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
