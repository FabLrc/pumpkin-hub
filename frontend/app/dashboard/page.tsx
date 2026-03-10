"use client";

import { useState } from "react";
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
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Trophy,
  Calendar,
  BarChart3,
  Key,
} from "lucide-react";
import { toast } from "sonner";
import { Navbar, Footer } from "@/components/layout";
import { useCurrentUser, useAuthorPlugins, useAuthorDashboardStats } from "@/lib/hooks";
import { resendVerification } from "@/lib/api";
import { DownloadChart, GranularitySelector } from "@/components/ui/DownloadChart";
import type { PluginSummary, DownloadGranularity } from "@/lib/types";

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

function formatTrend(percent: number): string {
  const sign = percent >= 0 ? "+" : "";
  return `${sign}${percent.toFixed(1)}%`;
}

function EmailVerificationBanner() {
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  async function handleResend() {
    setSending(true);
    try {
      await resendVerification();
      setSent(true);
      toast.success("Verification email sent! Check your inbox.");
    } catch {
      toast.error("Failed to send verification email. Try again later.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="bg-warning/10 border-b border-warning/30 px-6 py-3">
      <div className="max-w-5xl mx-auto flex items-center gap-3">
        <AlertCircle className="w-4 h-4 text-warning shrink-0" />
        <p className="font-mono text-xs text-text-primary flex-1">
          Your email is not verified. Some features may be limited.
        </p>
        {sent ? (
          <span className="font-mono text-xs text-success">
            Verification email sent!
          </span>
        ) : (
          <button
            type="button"
            onClick={handleResend}
            disabled={sending}
            className="font-mono text-xs text-accent hover:text-accent-light transition-colors cursor-pointer disabled:opacity-50"
          >
            {sending ? "Sending..." : "Resend verification email"}
          </button>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [granularity, setGranularity] = useState<DownloadGranularity>("weekly");
  const { data: user, isLoading: isLoadingUser } = useCurrentUser();
  const { data: pluginsData, isLoading: isLoadingPlugins } = useAuthorPlugins(
    user?.username ?? null,
  );
  const { data: stats, isLoading: isLoadingStats } = useAuthorDashboardStats(
    granularity,
    granularity === "daily" ? 30 : granularity === "monthly" ? 12 : 12,
  );

  // Redirect unauthenticated users
  if (!isLoadingUser && !user) {
    router.replace("/auth");
    return null;
  }

  const plugins = pluginsData?.data ?? [];
  const isLoading = isLoadingUser || isLoadingPlugins;

  return (
    <>
      <Navbar />
      {user && !user.email_verified && user.email && (
        <EmailVerificationBanner />
      )}
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

        {/* Advanced KPI Cards */}
        {isLoadingStats ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-28 bg-bg-surface border border-border-default animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <KpiCard
              icon={<Package className="w-5 h-5" />}
              label="Published Plugins"
              value={String(stats?.total_plugins ?? plugins.length)}
            />
            <KpiCard
              icon={<Download className="w-5 h-5" />}
              label="Total Downloads"
              value={formatDownloads(stats?.total_downloads ?? 0)}
            />
            <KpiCard
              icon={<Calendar className="w-5 h-5" />}
              label="Last 30 Days"
              value={formatDownloads(stats?.downloads_last_30_days ?? 0)}
              trend={stats?.downloads_trend_percent}
            />
            <KpiCard
              icon={<BarChart3 className="w-5 h-5" />}
              label="Last 7 Days"
              value={formatDownloads(stats?.downloads_last_7_days ?? 0)}
            />
          </div>
        )}

        {/* Most Downloaded Plugin highlight */}
        {stats?.most_downloaded_plugin && (
          <div className="border border-border-default bg-bg-elevated p-4 mb-8 flex items-center gap-4">
            <div className="w-9 h-9 bg-accent/10 border border-accent/30 flex items-center justify-center shrink-0">
              <Trophy className="w-4 h-4 text-accent" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="font-mono text-[10px] text-text-dim uppercase tracking-wider">
                Top Performer
              </span>
              <div className="flex items-baseline gap-2">
                <Link
                  href={`/plugins/${stats.most_downloaded_plugin.slug}`}
                  className="font-raleway font-bold text-sm text-text-primary hover:text-accent transition-colors"
                >
                  {stats.most_downloaded_plugin.name}
                </Link>
                <span className="font-mono text-xs text-text-dim">
                  {formatDownloads(stats.most_downloaded_plugin.downloads_total)} downloads
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Download Chart */}
        <div className="border border-border-default bg-bg-elevated mb-8">
          <div className="px-6 py-4 border-b border-border-default flex items-center justify-between">
            <h2 className="font-raleway font-bold text-sm text-text-primary tracking-wide uppercase">
              Download Trends
            </h2>
            <GranularitySelector value={granularity} onChange={setGranularity} />
          </div>
          <div className="px-6 py-6">
            {isLoadingStats ? (
              <div className="h-[160px] bg-bg-surface border border-border-default animate-pulse" />
            ) : stats?.recent_downloads && stats.recent_downloads.length > 0 ? (
              <DownloadChart
                data={stats.recent_downloads}
                granularity={granularity}
              />
            ) : (
              <div className="h-[160px] flex items-center justify-center">
                <p className="font-mono text-xs text-text-dim">
                  No download data yet. Downloads will appear here once users start downloading your plugins.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <Link
          href="/dashboard/api-keys"
          className="flex items-center gap-3 border border-border-default bg-bg-elevated p-4 mb-8 hover:border-accent/40 transition-colors group"
        >
          <div className="w-9 h-9 bg-bg-surface border border-border-default flex items-center justify-center shrink-0 group-hover:border-accent/40 transition-colors">
            <Key className="w-4 h-4 text-text-dim group-hover:text-accent transition-colors" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="font-raleway font-bold text-sm text-text-primary group-hover:text-accent transition-colors">
              API Keys
            </span>
            <span className="block font-mono text-[10px] text-text-dim">
              Manage keys for CI/CD integration and programmatic access
            </span>
          </div>
          <ExternalLink className="w-4 h-4 text-text-dim group-hover:text-accent transition-colors shrink-0" />
        </Link>

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

        {/* Member Info */}
        <div className="mt-4 text-right">
          <span className="font-mono text-[10px] text-text-dim">
            Member since {user ? formatDate(user.created_at) : "—"}
          </span>
        </div>
      </main>
      <Footer />
    </>
  );
}

function KpiCard({
  icon,
  label,
  value,
  trend,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  trend?: number;
}) {
  return (
    <div className="border border-border-default bg-bg-elevated p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-accent">{icon}</span>
        <span className="font-mono text-[10px] text-text-dim uppercase tracking-wider">
          {label}
        </span>
      </div>
      <div className="flex items-baseline gap-2">
        <div className="font-mono text-2xl font-bold text-text-primary">
          {value}
        </div>
        {trend !== undefined && trend !== 0 && (
          <span
            className={`inline-flex items-center gap-0.5 font-mono text-[10px] font-bold ${
              trend > 0 ? "text-success" : "text-danger"
            }`}
          >
            {trend > 0 ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            {formatTrend(trend)}
          </span>
        )}
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
