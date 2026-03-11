"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Package, Github } from "lucide-react";
import { Navbar, Footer } from "@/components/layout";
import { PluginForm } from "@/components/plugins/PluginForm";
import { PublishFromGithubForm } from "@/components/plugins/PublishFromGithubForm";
import { useCurrentUser } from "@/lib/hooks";
import { createPlugin } from "@/lib/api";
import type { PluginFormData } from "@/lib/validation";

type PublishMode = "manual" | "github";

export default function NewPluginPage() {
  const router = useRouter();
  const { data: user, isLoading: isLoadingUser } = useCurrentUser();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mode, setMode] = useState<PublishMode>("manual");

  // Redirect unauthenticated users
  if (!isLoadingUser && !user) {
    router.replace("/auth");
    return null;
  }

  async function handleCreate(data: PluginFormData) {
    setIsSubmitting(true);
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
      router.push(`/plugins/${plugin.slug}`);
    } finally {
      setIsSubmitting(false);
    }
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
        {isLoadingUser ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-12 bg-bg-surface border border-border-default animate-pulse"
              />
            ))}
          </div>
        ) : mode === "github" ? (
          <PublishFromGithubForm onSuccess={handleGithubSuccess} />
        ) : (
          <PluginForm
            onSubmit={handleCreate}
            submitLabel="Publish Plugin"
            isSubmitting={isSubmitting}
          />
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
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  description: string;
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
