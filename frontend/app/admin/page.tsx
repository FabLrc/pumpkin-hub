"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Shield,
  Package,
  Users,
  ScrollText,
  Download,
  Search,
  ToggleLeft,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { Navbar, Footer } from "@/components/layout";
import { useCurrentUser } from "@/lib/hooks";
import {
  fetchAdminStats,
  fetchAdminPlugins,
  fetchAdminUsers,
  fetchAuditLogs,
  deactivatePlugin,
  reactivatePlugin,
  deactivateUser,
  reactivateUser,
  changeUserRole,
} from "@/lib/api";
import type {
  AdminStatsResponse,
  AdminPluginEntry,
  AdminUserEntry,
  AuditLogEntry,
  PaginationMeta,
} from "@/lib/types";

type Tab = "overview" | "plugins" | "users" | "audit";

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

// ── Stats Cards ─────────────────────────────────────────────────────────────

function StatsOverview({ stats }: { readonly stats: AdminStatsResponse }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Users" value={stats.total_users} icon={<Users className="w-4 h-4" />} />
        <StatCard label="Active Plugins" value={stats.active_plugins} icon={<Package className="w-4 h-4" />} />
        <StatCard label="Deactivated" value={stats.deactivated_plugins} icon={<ToggleLeft className="w-4 h-4" />} accent="text-red-400" />
        <StatCard label="Total Downloads" value={stats.total_downloads} icon={<Download className="w-4 h-4" />} />
      </div>

      <div className="border border-border-default bg-bg-elevated/30 p-5">
        <h3 className="font-raleway font-bold text-sm text-text-primary mb-4">
          Recent Activity
        </h3>
        {stats.recent_audit_logs.length === 0 ? (
          <p className="font-mono text-xs text-text-dim">No recent activity</p>
        ) : (
          <div className="space-y-2">
            {stats.recent_audit_logs.map((log) => (
              <AuditLogRow key={log.id} log={log} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  accent,
}: {
  readonly label: string;
  readonly value: number;
  readonly icon: React.ReactNode;
  readonly accent?: string;
}) {
  return (
    <div className="border border-border-default bg-bg-elevated/30 p-4">
      <div className={`flex items-center gap-2 mb-2 ${accent ?? "text-accent"}`}>
        {icon}
        <span className="font-mono text-xs uppercase tracking-widest text-text-muted">
          {label}
        </span>
      </div>
      <div className="font-mono text-2xl font-bold text-text-primary">
        {formatNumber(value)}
      </div>
    </div>
  );
}

// ── Plugin Management ───────────────────────────────────────────────────────

function PluginsTab() {
  const [plugins, setPlugins] = useState<AdminPluginEntry[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const loadPlugins = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await fetchAdminPlugins(page, 20, search || undefined);
      setPlugins(data.data);
      setPagination(data.pagination);
    } catch {
      toast.error("Failed to load plugins");
    } finally {
      setIsLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    loadPlugins();
  }, [loadPlugins]);

  async function handleTogglePlugin(plugin: AdminPluginEntry) {
    try {
      if (plugin.is_active) {
        await deactivatePlugin(plugin.id);
        toast.success(`"${plugin.name}" deactivated`);
      } else {
        await reactivatePlugin(plugin.id);
        toast.success(`"${plugin.name}" reactivated`);
      }
      loadPlugins();
    } catch {
      toast.error("Action failed");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-dim" />
          <input
            type="text"
            placeholder="Search plugins or authors..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full bg-bg-surface border border-border-default text-text-primary font-mono text-xs px-3 py-2 pl-9 placeholder:text-text-dim focus:outline-none focus:border-accent"
          />
        </div>
      </div>

      <div className={`space-y-1 ${isLoading ? "opacity-50" : ""}`}>
        {plugins.map((plugin) => (
          <div
            key={plugin.id}
            className="flex items-center gap-4 border border-border-default bg-bg-elevated/30 px-4 py-3"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Link
                  href={`/plugins/${plugin.slug}`}
                  className="font-raleway font-bold text-sm text-text-primary hover:text-accent transition-colors truncate"
                >
                  {plugin.name}
                </Link>
                {!plugin.is_active && (
                  <span className="font-mono text-[10px] px-1.5 py-0.5 border border-red-500/30 text-red-400 bg-red-500/5">
                    INACTIVE
                  </span>
                )}
              </div>
              <p className="font-mono text-xs text-text-muted">
                by {plugin.author_username} · {formatNumber(plugin.downloads_total)} downloads
              </p>
            </div>
            <button
              onClick={() => handleTogglePlugin(plugin)}
              className={`font-mono text-xs px-3 py-1.5 border transition-colors ${
                plugin.is_active
                  ? "border-red-500/30 text-red-400 hover:bg-red-500/10"
                  : "border-green-500/30 text-green-400 hover:bg-green-500/10"
              }`}
            >
              {plugin.is_active ? "Deactivate" : "Reactivate"}
            </button>
          </div>
        ))}
      </div>

      <Pagination pagination={pagination} page={page} onPageChange={setPage} />
    </div>
  );
}

// ── User Management ─────────────────────────────────────────────────────────

function UsersTab() {
  const [users, setUsers] = useState<AdminUserEntry[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const loadUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await fetchAdminUsers(page, 20, search || undefined);
      setUsers(data.data);
      setPagination(data.pagination);
    } catch {
      toast.error("Failed to load users");
    } finally {
      setIsLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  async function handleToggleUser(user: AdminUserEntry) {
    try {
      if (user.is_active) {
        await deactivateUser(user.id);
        toast.success(`"${user.username}" deactivated`);
      } else {
        await reactivateUser(user.id);
        toast.success(`"${user.username}" reactivated`);
      }
      loadUsers();
    } catch {
      toast.error("Action failed");
    }
  }

  async function handleRoleChange(user: AdminUserEntry, newRole: string) {
    try {
      await changeUserRole(user.id, newRole);
      toast.success(`Role changed to ${newRole}`);
      loadUsers();
    } catch {
      toast.error("Failed to change role");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-dim" />
          <input
            type="text"
            placeholder="Search users or emails..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full bg-bg-surface border border-border-default text-text-primary font-mono text-xs px-3 py-2 pl-9 placeholder:text-text-dim focus:outline-none focus:border-accent"
          />
        </div>
      </div>

      <div className={`space-y-1 ${isLoading ? "opacity-50" : ""}`}>
        {users.map((user) => (
          <div
            key={user.id}
            className="flex items-center gap-4 border border-border-default bg-bg-elevated/30 px-4 py-3"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Link
                  href={`/users/${user.username}`}
                  className="font-raleway font-bold text-sm text-text-primary hover:text-accent transition-colors"
                >
                  {user.username}
                </Link>
                {!user.is_active && (
                  <span className="font-mono text-[10px] px-1.5 py-0.5 border border-red-500/30 text-red-400 bg-red-500/5">
                    BANNED
                  </span>
                )}
              </div>
              <p className="font-mono text-xs text-text-muted">
                {user.email ?? "No email"} · {user.plugin_count} plugins · Joined{" "}
                {formatDate(user.created_at)}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <RoleSelector
                currentRole={user.role}
                onChange={(role) => handleRoleChange(user, role)}
              />
              <button
                onClick={() => handleToggleUser(user)}
                className={`font-mono text-xs px-3 py-1.5 border transition-colors ${
                  user.is_active
                    ? "border-red-500/30 text-red-400 hover:bg-red-500/10"
                    : "border-green-500/30 text-green-400 hover:bg-green-500/10"
                }`}
              >
                {user.is_active ? "Ban" : "Unban"}
              </button>
            </div>
          </div>
        ))}
      </div>

      <Pagination pagination={pagination} page={page} onPageChange={setPage} />
    </div>
  );
}

function RoleSelector({
  currentRole,
  onChange,
}: {
  readonly currentRole: string;
  readonly onChange: (role: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const roles = ["author", "moderator", "admin"];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="font-mono text-xs px-3 py-1.5 border border-border-default text-text-subtle hover:border-border-hover flex items-center gap-1.5 transition-colors"
      >
        {currentRole}
        <ChevronDown className="w-3 h-3" />
      </button>
      {isOpen && (
        <div className="absolute right-0 top-full mt-1 border border-border-default bg-bg-elevated z-10 min-w-[120px]">
          {roles.map((role) => (
            <button
              key={role}
              onClick={() => {
                if (role !== currentRole) onChange(role);
                setIsOpen(false);
              }}
              className={`block w-full text-left font-mono text-xs px-3 py-1.5 hover:bg-bg-surface transition-colors ${
                role === currentRole ? "text-accent" : "text-text-subtle"
              }`}
            >
              {role}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Audit Log ───────────────────────────────────────────────────────────────

function AuditTab() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        setIsLoading(true);
        const data = await fetchAuditLogs(page, 30);
        setLogs(data.data);
        setPagination(data.pagination);
      } catch {
        toast.error("Failed to load audit logs");
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [page]);

  return (
    <div className="space-y-2">
      <div className={isLoading ? "opacity-50" : ""}>
        {logs.length === 0 ? (
          <p className="font-mono text-xs text-text-dim py-8 text-center">
            No audit logs yet
          </p>
        ) : (
          logs.map((log) => <AuditLogRow key={log.id} log={log} />)
        )}
      </div>
      <Pagination pagination={pagination} page={page} onPageChange={setPage} />
    </div>
  );
}

function AuditLogRow({ log }: { readonly log: AuditLogEntry }) {
  const actionColors: Record<string, string> = {
    "plugin.deactivate": "text-red-400",
    "plugin.reactivate": "text-green-400",
    "user.deactivate": "text-red-400",
    "user.reactivate": "text-green-400",
    "user.role_change": "text-accent",
  };

  return (
    <div className="flex items-center gap-3 border border-border-default bg-bg-elevated/30 px-4 py-2.5">
      <ScrollText className="w-3.5 h-3.5 text-text-dim flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <span className="font-mono text-xs text-text-subtle">
          {log.actor_username}
        </span>{" "}
        <span className={`font-mono text-xs font-bold ${actionColors[log.action] ?? "text-text-primary"}`}>
          {log.action}
        </span>{" "}
        <span className="font-mono text-xs text-text-muted">
          on {log.target_type}:{log.target_id.slice(0, 8)}
        </span>
        {log.details && (
          <span className="font-mono text-xs text-text-muted ml-2">
            {JSON.stringify(log.details)}
          </span>
        )}
      </div>
      <span className="font-mono text-xs text-text-muted flex-shrink-0">
        {formatDate(log.created_at)}
      </span>
    </div>
  );
}

// ── Shared Pagination ───────────────────────────────────────────────────────

function Pagination({
  pagination,
  page,
  onPageChange,
}: {
  readonly pagination: PaginationMeta | null;
  readonly page: number;
  readonly onPageChange: (page: number) => void;
}) {
  if (!pagination || pagination.total_pages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-2 pt-2">
      <button
        onClick={() => onPageChange(Math.max(1, page - 1))}
        disabled={page <= 1}
        className="font-mono text-xs border border-border-default px-3 py-1.5 text-text-dim hover:border-accent hover:text-accent transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      >
        ← Prev
      </button>
      <span className="font-mono text-xs text-text-dim">
        {page} / {pagination.total_pages}
      </span>
      <button
        onClick={() => onPageChange(Math.min(pagination.total_pages, page + 1))}
        disabled={page >= pagination.total_pages}
        className="font-mono text-xs border border-border-default px-3 py-1.5 text-text-dim hover:border-accent hover:text-accent transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      >
        Next →
      </button>
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────

export default function AdminPage() {
  const router = useRouter();
  const { data: user, isLoading: isUserLoading } = useCurrentUser();
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [stats, setStats] = useState<AdminStatsResponse | null>(null);

  useEffect(() => {
    if (!isUserLoading && (!user || (user.role !== "admin" && user.role !== "moderator"))) {
      router.replace("/");
    }
  }, [user, isUserLoading, router]);

  useEffect(() => {
    if (user && (user.role === "admin" || user.role === "moderator")) {
      fetchAdminStats()
        .then(setStats)
        .catch(() => toast.error("Failed to load admin stats"));
    }
  }, [user]);

  if (isUserLoading || !user) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-bg-primary py-12 px-6">
          <div className="max-w-6xl mx-auto animate-pulse space-y-6">
            <div className="h-8 w-48 bg-bg-surface border border-border-default" />
            <div className="grid grid-cols-4 gap-4">
              {["sk-1", "sk-2", "sk-3", "sk-4"].map((key) => (
                <div key={key} className="h-24 bg-bg-surface border border-border-default" />
              ))}
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "overview", label: "Overview", icon: <Shield className="w-3.5 h-3.5" /> },
    { key: "plugins", label: "Plugins", icon: <Package className="w-3.5 h-3.5" /> },
    { key: "users", label: "Users", icon: <Users className="w-3.5 h-3.5" /> },
    { key: "audit", label: "Audit Log", icon: <ScrollText className="w-3.5 h-3.5" /> },
  ];

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-bg-primary py-12 px-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Back link */}
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 font-mono text-xs text-text-dim hover:text-accent transition-colors"
          >
            <ArrowLeft className="w-3 h-3" />
            Back to Dashboard
          </Link>

          {/* Header */}
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-accent" />
            <h1 className="font-raleway font-black text-2xl text-text-primary">
              Admin Panel
            </h1>
          </div>

          {/* Tab navigation */}
          <div className="flex items-center gap-1 border-b border-border-default">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 font-mono text-xs px-4 py-2.5 border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? "border-accent text-accent"
                    : "border-transparent text-text-dim hover:text-text-subtle"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div>
            {activeTab === "overview" && stats && <StatsOverview stats={stats} />}
            {activeTab === "overview" && !stats && (
              <div className="animate-pulse space-y-4">
                <div className="grid grid-cols-4 gap-4">
                  {["sk-1", "sk-2", "sk-3", "sk-4"].map((key) => (
                    <div key={key} className="h-24 bg-bg-surface border border-border-default" />
                  ))}
                </div>
              </div>
            )}
            {activeTab === "plugins" && <PluginsTab />}
            {activeTab === "users" && <UsersTab />}
            {activeTab === "audit" && <AuditTab />}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
