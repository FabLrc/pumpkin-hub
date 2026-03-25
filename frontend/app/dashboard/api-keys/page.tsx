"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Key,
  Plus,
  Copy,
  Check,
  Trash2,
  Shield,
  AlertTriangle,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { mutate } from "swr";
import { Navbar, Footer } from "@/components/layout";
import { useCurrentUser, useApiKeys } from "@/lib/hooks";
import { createApiKey, revokeApiKey, getApiKeysPath } from "@/lib/api";
import type { CreateApiKeyResponse, ApiKeySummary } from "@/lib/types";

const AVAILABLE_PERMISSIONS = [
  { value: "publish", label: "Publish", description: "Create and update plugins" },
  { value: "upload", label: "Upload", description: "Upload binary artifacts" },
  { value: "read", label: "Read", description: "Read private plugin data" },
] as const;

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatRelativeTime(dateString: string): string {
  const diff = Date.now() - new Date(dateString).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function ApiKeysPage() {
  const router = useRouter();
  const { data: user, isLoading: isLoadingUser } = useCurrentUser();
  const { data: keys, isLoading: isLoadingKeys } = useApiKeys();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newKey, setNewKey] = useState<CreateApiKeyResponse | null>(null);

  if (!isLoadingUser && !user) {
    router.replace("/auth");
    return null;
  }

  return (
    <>
      <Navbar />
      <main className="max-w-3xl mx-auto px-6 py-12">
        {/* Back link */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-xs font-mono text-text-dim hover:text-text-primary transition-colors mb-8"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to dashboard
        </Link>

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-accent flex items-center justify-center">
                <Key className="w-5 h-5 text-black" />
              </div>
              <h1 className="font-raleway font-bold text-2xl text-text-primary tracking-wide">
                API Keys
              </h1>
            </div>
            <p className="font-mono text-xs text-text-dim max-w-lg">
              Manage API keys for CI/CD integration and programmatic access to the Pumpkin Hub API.
            </p>
          </div>
          {!showCreateForm && !newKey && (
            <button
              type="button"
              onClick={() => setShowCreateForm(true)}
              disabled={(keys?.length ?? 0) >= 10}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-accent text-black font-mono text-xs font-bold tracking-wider uppercase hover:bg-accent-light transition-colors shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" />
              New Key
            </button>
          )}
        </div>

        {/* New key reveal banner */}
        {newKey && (
          <NewKeyBanner
            apiKey={newKey}
            onDismiss={() => setNewKey(null)}
          />
        )}

        {/* Create form */}
        {showCreateForm && !newKey && (
          <CreateApiKeyForm
            onCreated={(key) => {
              setNewKey(key);
              setShowCreateForm(false);
              mutate(getApiKeysPath());
            }}
            onCancel={() => setShowCreateForm(false)}
          />
        )}

        {/* Keys list */}
        <div className="border border-border-default bg-bg-elevated">
          <div className="px-6 py-4 border-b border-border-default flex items-center justify-between">
            <h2 className="font-raleway font-bold text-sm text-text-primary tracking-wide uppercase">
              Active Keys
            </h2>
            <span className="font-mono text-xs text-text-muted">
              {keys?.length ?? 0} / 10
            </span>
          </div>

          {isLoadingKeys || isLoadingUser ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 2 }).map((_, i) => (
                <div
                  key={i}
                  className="h-20 bg-bg-surface border border-border-default animate-pulse"
                />
              ))}
            </div>
          ) : !keys || keys.length === 0 ? (
            <div className="p-12 text-center">
              <Key className="w-10 h-10 text-text-dim mx-auto mb-4" />
              <p className="font-mono text-sm text-text-muted mb-2">
                No API keys yet
              </p>
              <p className="font-mono text-xs text-text-dim mb-6 max-w-sm mx-auto">
                Create an API key to integrate with CI/CD pipelines or automate plugin publishing.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border-default">
              {keys.map((key) => (
                <ApiKeyRow key={key.id} apiKey={key} />
              ))}
            </div>
          )}
        </div>

        {/* Usage guide */}
        <div className="mt-8 border border-border-default bg-bg-elevated p-6">
          <h3 className="font-raleway font-bold text-sm text-text-primary tracking-wide uppercase mb-4">
            Usage
          </h3>
          <div className="space-y-3">
            <div className="font-mono text-xs text-text-dim">
              Authenticate API requests by including the key in the{" "}
              <code className="px-1.5 py-0.5 bg-bg-surface border border-border-default text-text-subtle">
                X-API-Key
              </code>{" "}
              header:
            </div>
            <div className="bg-bg-surface border border-border-default p-4">
              <code className="font-mono text-xs text-accent break-all">
                curl -H &quot;X-API-Key: phub_your_key_here&quot; \<br />
                &nbsp;&nbsp;https://api.pumpkinhub.dev/api/v1/plugins
              </code>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

function CreateApiKeyForm({
  onCreated,
  onCancel,
}: {
  onCreated: (key: CreateApiKeyResponse) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [permissions, setPermissions] = useState<string[]>([]);
  const [expiresIn, setExpiresIn] = useState<string>("never");
  const [submitting, setSubmitting] = useState(false);

  const togglePermission = useCallback((perm: string) => {
    setPermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm],
    );
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }

    setSubmitting(true);
    try {
      let expiresAt: string | undefined;
      if (expiresIn !== "never") {
        const days = Number(expiresIn);
        const date = new Date();
        date.setDate(date.getDate() + days);
        expiresAt = date.toISOString();
      }

      const key = await createApiKey({
        name: name.trim(),
        permissions,
        expires_at: expiresAt,
      });
      onCreated(key);
      toast.success("API key created");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create API key");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="border border-accent/30 bg-bg-elevated p-6 mb-6"
    >
      <h3 className="font-raleway font-bold text-sm text-text-primary mb-4">
        Create New API Key
      </h3>

      {/* Name field */}
      <div className="mb-4">
        <label
          htmlFor="key-name"
          className="block font-mono text-xs text-text-muted uppercase tracking-wider mb-2"
        >
          Name
        </label>
        <input
          id="key-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. GitHub Actions Deploy"
          maxLength={64}
          className="w-full bg-bg-surface border border-border-default px-3 py-2 font-mono text-xs text-text-primary placeholder:text-text-dim focus:outline-none focus:border-accent"
        />
      </div>

      {/* Permissions */}
      <div className="mb-4">
        <span className="block font-mono text-xs text-text-muted uppercase tracking-wider mb-2">
          Permissions
        </span>
        <div className="flex flex-wrap gap-2">
          {AVAILABLE_PERMISSIONS.map((perm) => (
            <button
              key={perm.value}
              type="button"
              onClick={() => togglePermission(perm.value)}
              className={`px-3 py-1.5 font-mono text-xs border transition-colors cursor-pointer ${
                permissions.includes(perm.value)
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-border-default text-text-dim hover:border-border-hover"
              }`}
              title={perm.description}
            >
              {perm.label}
            </button>
          ))}
        </div>
      </div>

      {/* Expiration */}
      <div className="mb-6">
        <label
          htmlFor="key-expires"
          className="block font-mono text-xs text-text-muted uppercase tracking-wider mb-2"
        >
          Expires
        </label>
        <select
          id="key-expires"
          value={expiresIn}
          onChange={(e) => setExpiresIn(e.target.value)}
          className="bg-bg-surface border border-border-default px-3 py-2 font-mono text-xs text-text-primary focus:outline-none focus:border-accent cursor-pointer"
        >
          <option value="never">Never</option>
          <option value="30">30 days</option>
          <option value="90">90 days</option>
          <option value="180">6 months</option>
          <option value="365">1 year</option>
        </select>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-2 bg-accent text-black font-mono text-xs font-bold uppercase tracking-wider hover:bg-accent-light transition-colors disabled:opacity-50"
        >
          {submitting ? "Creating..." : "Create Key"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-border-default font-mono text-xs text-text-dim hover:text-text-primary hover:border-border-hover transition-colors cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function NewKeyBanner({
  apiKey,
  onDismiss,
}: {
  apiKey: CreateApiKeyResponse;
  onDismiss: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(apiKey.key);
    setCopied(true);
    toast.success("API key copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="border border-warning/40 bg-warning/5 p-6 mb-6">
      <div className="flex items-start gap-3 mb-4">
        <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
        <div>
          <h3 className="font-raleway font-bold text-sm text-text-primary mb-1">
            Save your API key now
          </h3>
          <p className="font-mono text-xs text-text-dim">
            This is the only time you will see the full key. Store it securely — it cannot be retrieved later.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <div className="flex-1 bg-bg-surface border border-border-default px-4 py-3">
          <code className="font-mono text-xs text-accent break-all select-all">
            {apiKey.key}
          </code>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="p-3 border border-border-default hover:border-accent hover:text-accent transition-colors shrink-0 cursor-pointer"
          title="Copy to clipboard"
        >
          {copied ? (
            <Check className="w-4 h-4 text-success" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
        </button>
      </div>

      <button
        type="button"
        onClick={onDismiss}
        className="font-mono text-xs text-text-dim hover:text-text-primary transition-colors cursor-pointer"
      >
        I&apos;ve saved my key — dismiss
      </button>
    </div>
  );
}

function ApiKeyRow({ apiKey }: { apiKey: ApiKeySummary }) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isExpired =
    apiKey.expires_at && new Date(apiKey.expires_at) < new Date();

  async function handleRevoke() {
    setDeleting(true);
    try {
      await revokeApiKey(apiKey.id);
      mutate(getApiKeysPath());
      toast.success(`Key "${apiKey.name}" revoked`);
    } catch {
      toast.error("Failed to revoke key");
    } finally {
      setDeleting(false);
      setConfirming(false);
    }
  }

  return (
    <div className="px-6 py-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-raleway font-bold text-sm text-text-primary">
              {apiKey.name}
            </span>
            {isExpired && (
              <span className="font-mono text-[10px] text-danger border border-danger/30 px-1.5 py-0.5">
                EXPIRED
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 font-mono text-xs text-text-muted">
            <code className="px-1.5 py-0.5 bg-bg-surface border border-border-default text-text-subtle">
              {apiKey.key_prefix}...
            </code>
            <span>Created {formatDate(apiKey.created_at)}</span>
            {apiKey.last_used_at && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Used {formatRelativeTime(apiKey.last_used_at)}
              </span>
            )}
            {apiKey.expires_at && !isExpired && (
              <span>
                Expires {formatDate(apiKey.expires_at)}
              </span>
            )}
          </div>

          {apiKey.permissions.length > 0 && (
            <div className="flex items-center gap-1.5 mt-2">
              <Shield className="w-3 h-3 text-text-dim" />
              {apiKey.permissions.map((perm) => (
                <span
                  key={perm}
                  className="font-mono text-[10px] px-1.5 py-0.5 border border-border-default text-text-subtle"
                >
                  {perm}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Revoke button */}
        <div className="shrink-0">
          {confirming ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRevoke}
                disabled={deleting}
                className="px-3 py-1.5 bg-danger text-white font-mono text-xs font-bold uppercase tracking-wider hover:bg-danger/80 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {deleting ? "..." : "Confirm"}
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="px-3 py-1.5 border border-border-default font-mono text-xs text-text-dim hover:text-text-primary transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="p-2 text-text-dim hover:text-danger transition-colors cursor-pointer"
              title="Revoke key"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
