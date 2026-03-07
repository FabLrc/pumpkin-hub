"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Pencil } from "lucide-react";
import { Navbar, Footer } from "@/components/layout";
import { PluginForm } from "@/components/plugins/PluginForm";
import { usePlugin, useCurrentUser } from "@/lib/hooks";
import { updatePlugin, getPluginPath } from "@/lib/api";
import { mutate } from "swr";
import type { PluginFormData } from "@/lib/validation";

interface EditPluginPageProps {
  params: Promise<{ slug: string }>;
}

export default function EditPluginPage({ params }: EditPluginPageProps) {
  const { slug } = use(params);
  const router = useRouter();
  const { data: user, isLoading: isLoadingUser } = useCurrentUser();
  const { data: plugin, isLoading: isLoadingPlugin } = usePlugin(slug);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isLoading = isLoadingUser || isLoadingPlugin;

  // Redirect unauthenticated users
  if (!isLoadingUser && !user) {
    router.replace("/auth");
    return null;
  }

  // Ownership check — only the author (or admin/moderator) can edit
  const isOwner =
    user && plugin && (user.id === plugin.author.id || user.role !== "author");

  if (!isLoading && plugin && !isOwner) {
    router.replace(`/plugins/${slug}`);
    return null;
  }

  async function handleUpdate(data: PluginFormData) {
    setIsSubmitting(true);
    try {
      const updated = await updatePlugin(slug, {
        name: data.name.trim(),
        short_description: data.shortDescription || undefined,
        description: data.description || undefined,
        repository_url: data.repositoryUrl || undefined,
        documentation_url: data.documentationUrl || undefined,
        license: data.license || undefined,
        category_ids:
          data.categoryIds.length > 0 ? data.categoryIds : undefined,
      });
      // Revalidate the plugin cache
      await mutate(getPluginPath(slug));
      router.push(`/plugins/${updated.slug}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  const initialData: PluginFormData | undefined = plugin
    ? {
        name: plugin.name,
        shortDescription: plugin.short_description ?? "",
        description: plugin.description ?? "",
        repositoryUrl: plugin.repository_url ?? "",
        documentationUrl: plugin.documentation_url ?? "",
        license: plugin.license ?? "",
        categoryIds: plugin.categories.map((c) => c.id),
      }
    : undefined;

  return (
    <>
      <Navbar />
      <main className="max-w-3xl mx-auto px-6 py-12">
        {/* Back link */}
        <Link
          href={`/plugins/${slug}`}
          className="inline-flex items-center gap-2 text-xs font-mono text-text-dim hover:text-text-primary transition-colors mb-8"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to plugin
        </Link>

        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-accent flex items-center justify-center">
              <Pencil className="w-5 h-5 text-black" />
            </div>
            <h1 className="font-raleway font-bold text-2xl text-text-primary tracking-wide">
              Edit Plugin
            </h1>
          </div>
          {plugin && (
            <p className="font-mono text-xs text-text-dim">
              Editing{" "}
              <span className="text-accent">{plugin.name}</span>
            </p>
          )}
        </div>

        {/* Loading state */}
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-12 bg-bg-surface border border-border-default animate-pulse"
              />
            ))}
          </div>
        ) : plugin && initialData ? (
          <PluginForm
            initialData={initialData}
            onSubmit={handleUpdate}
            submitLabel="Save Changes"
            isSubmitting={isSubmitting}
          />
        ) : (
          <div className="text-center py-20">
            <p className="font-mono text-sm text-text-dim">
              Plugin not found.
            </p>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
