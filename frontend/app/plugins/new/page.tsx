"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Package } from "lucide-react";
import { Navbar, Footer } from "@/components/layout";
import { PluginForm } from "@/components/plugins/PluginForm";
import { useCurrentUser } from "@/lib/hooks";
import { createPlugin } from "@/lib/api";
import type { PluginFormData } from "@/lib/validation";

export default function NewPluginPage() {
  const router = useRouter();
  const { data: user, isLoading: isLoadingUser } = useCurrentUser();
  const [isSubmitting, setIsSubmitting] = useState(false);

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
            Share your creation with the Pumpkin MC community. Fill in the
            details below and your plugin will be live immediately.
          </p>
        </div>

        {/* Loading state */}
        {isLoadingUser ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-12 bg-bg-surface border border-border-default animate-pulse"
              />
            ))}
          </div>
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
