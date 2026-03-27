"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useState, type ChangeEvent } from "react";
import { ArrowLeft, Package, Github, ImagePlus, X } from "lucide-react";
import { Navbar, Footer } from "@/components/layout";
import { PluginForm } from "@/components/plugins/PluginForm";
import { PublishFromGithubForm } from "@/components/plugins/PublishFromGithubForm";
import { useCurrentUser } from "@/lib/hooks";
import { createPlugin, uploadPluginIcon } from "@/lib/api";
import type { PluginFormData } from "@/lib/validation";

type PublishMode = "manual" | "github";

export default function NewPluginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: user, isLoading: isLoadingUser } = useCurrentUser();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [iconError, setIconError] = useState<string | null>(null);

  // Pre-select GitHub mode when redirected from the GitHub App installation
  const initialMode: PublishMode =
    searchParams.get("mode") === "github" ? "github" : "manual";
  const [mode, setMode] = useState<PublishMode>(initialMode);

  // Auto-load repos when coming back from GitHub App installation
  const autoLoad = searchParams.get("installation_id") !== null;

  // Redirect unauthenticated users
  if (!isLoadingUser && !user) {
    router.replace("/auth");
    return null;
  }

  async function handleCreate(data: PluginFormData) {
    setIsSubmitting(true);
    setIconError(null);
    try {
      const plugin = await createPlugin({
        name: data.name.trim(),
        short_description: data.shortDescription || undefined,
        description: data.description || undefined,
        repository_url: data.repositoryUrl || undefined,
        documentation_url: data.documentationUrl || undefined,
        license: data.license || undefined,
        category_ids:
          data.categoryIds.length > 0 ? data.categoryIds : undefined,
      });

      if (iconFile) {
        await uploadPluginIcon(plugin.slug, iconFile);
      }

      router.push(`/plugins/${plugin.slug}`);
    } catch (error) {
      setIconError(error instanceof Error ? error.message : "Failed to publish plugin");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleIconSelection(event: ChangeEvent<HTMLInputElement>) {
    setIconError(null);
    const file = event.target.files?.[0] ?? null;
    if (!file) {
      setIconFile(null);
      return;
    }

    const acceptedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!acceptedTypes.includes(file.type)) {
      setIconError("Unsupported icon type. Allowed: JPEG, PNG, WebP");
      setIconFile(null);
      return;
    }

    const maxSizeBytes = 5 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      setIconError("Icon file is too large. Maximum size is 5 MB");
      setIconFile(null);
      return;
    }

    setIconFile(file);
  }

  function handleGithubSuccess(pluginSlug: string) {
    router.push(`/plugins/${pluginSlug}`);
  }

  return (
    <>
      <Navbar />
      <main className="max-w-3xl mx-auto px-6 py-12">
        {/* Back link */}
        <Link
          href="/explorer"
          className="inline-flex items-center gap-2 text-xs font-mono text-text-dim hover:text-text-primary transition-colors mb-8"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to explorer
        </Link>

        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-accent flex items-center justify-center">
              <Package className="w-5 h-5 text-black" />
            </div>
            <h1 className="font-raleway font-bold text-2xl text-text-primary tracking-wide">
              Publish a Plugin
            </h1>
          </div>
          <p className="font-mono text-xs text-text-dim max-w-lg">
            Share your creation with the Pumpkin MC community.
          </p>
        </div>

        {/* Mode toggle */}
        <div className="flex mb-8 border border-border-default">
          <ModeTab
            active={mode === "manual"}
            onClick={() => setMode("manual")}
            icon={<Package className="w-3.5 h-3.5" />}
            label="Manual"
            description="Fill in all fields yourself"
          />
          <ModeTab
            active={mode === "github"}
            onClick={() => setMode("github")}
            icon={<Github className="w-3.5 h-3.5" />}
            label="From GitHub"
            description="Auto-fill from a GitHub repository"
          />
        </div>

        {/* Form */}
        {isLoadingUser && (
          <div className="space-y-4">
            {["sk-1", "sk-2", "sk-3", "sk-4", "sk-5"].map((key) => (
              <div
                key={key}
                className="h-12 bg-bg-surface border border-border-default animate-pulse"
              />
            ))}
          </div>
        )}
        {!isLoadingUser && mode === "github" && (
          <PublishFromGithubForm onSuccess={handleGithubSuccess} autoLoad={autoLoad} />
        )}
        {!isLoadingUser && mode !== "github" && (
          <div className="space-y-6">
            <PluginForm
              onSubmit={handleCreate}
              submitLabel="Publish Plugin"
              isSubmitting={isSubmitting}
            />

            <section className="border border-border-default bg-bg-elevated p-4 space-y-3">
              <h2 className="font-mono text-xs uppercase tracking-widest text-text-muted flex items-center gap-2">
                <ImagePlus className="w-3.5 h-3.5" />
                Plugin Icon (optional)
              </h2>
              <label htmlFor="plugin-icon" className="font-mono text-[10px] text-text-dim">
                Upload an image shown in explorer, home and plugin detail pages
              </label>
              <input
                id="plugin-icon"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleIconSelection}
                title="Select plugin icon image"
                className="w-full font-mono text-xs text-text-subtle file:mr-3 file:px-3 file:py-2 file:border file:border-border-default file:bg-bg-surface file:text-text-subtle"
              />
              {iconFile && (
                <div className="flex items-center justify-between font-mono text-xs text-text-dim border border-border-default px-3 py-2">
                  <span className="truncate pr-3">{iconFile.name}</span>
                  <button
                    type="button"
                    onClick={() => setIconFile(null)}
                    className="text-text-dim hover:text-error transition-colors cursor-pointer"
                    aria-label="Remove selected icon"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              {iconError && (
                <p className="font-mono text-xs text-error">{iconError}</p>
              )}
            </section>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}

// ── Mode Tab ─────────────────────────────────────────────────────────────

function ModeTab({
  active,
  onClick,
  icon,
  label,
  description,
}: {
  readonly active: boolean;
  readonly onClick: () => void;
  readonly icon: React.ReactNode;
  readonly label: string;
  readonly description: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 flex items-center gap-3 px-5 py-3.5 transition-colors cursor-pointer border-r border-border-default last:border-r-0 ${
        active
          ? "bg-accent/5 border-b-2 border-b-accent text-text-primary"
          : "hover:bg-bg-surface text-text-dim"
      }`}
    >
      <span className={active ? "text-accent" : "text-text-dim/60"}>{icon}</span>
      <div className="text-left">
        <div className="font-mono text-xs font-bold">{label}</div>
        <div className="font-mono text-[10px] text-text-dim/70">{description}</div>
      </div>
    </button>
  );
}
