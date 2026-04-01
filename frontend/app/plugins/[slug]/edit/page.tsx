"use client";

import { use, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Pencil, ImagePlus, Trash2 } from "lucide-react";
import { Navbar, Footer } from "@/components/layout";
import { PluginForm } from "@/components/plugins/PluginForm";
import { GitHubIntegration } from "@/components/plugins/GitHubIntegration";
import { usePlugin, useCurrentUser } from "@/lib/hooks";
import { updatePlugin, getPluginPath, uploadPluginIcon, deletePluginIcon } from "@/lib/api";
import { mutate } from "swr";
import type { PluginFormData } from "@/lib/validation";

interface EditPluginPageProps {
  readonly params: Promise<{ readonly slug: string }>;
}

export default function EditPluginPage({ params }: EditPluginPageProps) {
  const { slug } = use(params);
  const router = useRouter();
  const { data: user, isLoading: isLoadingUser } = useCurrentUser();
  const { data: plugin, isLoading: isLoadingPlugin } = usePlugin(slug);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUpdatingIcon, setIsUpdatingIcon] = useState(false);
  const [iconError, setIconError] = useState<string | null>(null);

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

  async function handleIconChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setIconError(null);

    const acceptedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!acceptedTypes.includes(file.type)) {
      setIconError("Unsupported icon type. Allowed: JPEG, PNG, WebP");
      return;
    }

    const maxSizeBytes = 5 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      setIconError("Icon file is too large. Maximum size is 5 MB");
      return;
    }

    setIsUpdatingIcon(true);
    try {
      await uploadPluginIcon(slug, file);
      await mutate(getPluginPath(slug));
    } catch (error) {
      setIconError(error instanceof Error ? error.message : "Failed to upload icon");
    } finally {
      setIsUpdatingIcon(false);
      event.target.value = "";
    }
  }

  async function handleRemoveIcon() {
    setIconError(null);
    setIsUpdatingIcon(true);
    try {
      await deletePluginIcon(slug);
      await mutate(getPluginPath(slug));
    } catch (error) {
      setIconError(error instanceof Error ? error.message : "Failed to remove icon");
    } finally {
      setIsUpdatingIcon(false);
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
        {isLoading && (
          <div className="space-y-4">
            {["sk-a", "sk-b", "sk-c", "sk-d", "sk-e"].map((k) => (
              <div
                key={k}
                className="h-12 bg-bg-surface border border-border-default animate-pulse"
              />
            ))}
          </div>
        )}
        {!isLoading && plugin && initialData && (
          <>
            <PluginForm
              initialData={initialData}
              onSubmit={handleUpdate}
              submitLabel="Save Changes"
              isSubmitting={isSubmitting}
            />

            <section className="mt-6 border border-border-default bg-bg-elevated p-4 space-y-3">
              <h2 className="font-mono text-xs uppercase tracking-widest text-text-muted flex items-center gap-2">
                <ImagePlus className="w-3.5 h-3.5" />
                Plugin Icon
              </h2>

              <div className="flex items-center gap-4">
                <div className="w-14 h-14 border border-border-default bg-bg-surface overflow-hidden flex items-center justify-center">
                  {plugin.icon_url ? (
                    // eslint-disable-next-line @next/next/no-img-element -- remote icon URL can come from S3-compatible storage hosts
                    <img
                      src={plugin.icon_url}
                      alt={`${plugin.name} icon`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span
                      className="font-mono font-bold text-xs text-text-subtle"
                      role="img"
                      aria-label={`${plugin.name} icon fallback`}
                    >
                      {plugin.name.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>

                <div className="flex-1">
                  <label htmlFor="edit-plugin-icon" className="sr-only">
                    Select plugin icon image
                  </label>
                  <input
                    id="edit-plugin-icon"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleIconChange}
                    disabled={isUpdatingIcon}
                    title="Select plugin icon image"
                    className="w-full font-mono text-xs text-text-subtle file:mr-3 file:px-3 file:py-2 file:border file:border-border-default file:bg-bg-surface file:text-text-subtle disabled:opacity-60"
                  />
                </div>

                {plugin.icon_url && (
                  <button
                    type="button"
                    onClick={handleRemoveIcon}
                    disabled={isUpdatingIcon}
                    title="Remove current plugin icon"
                    aria-label="Remove current plugin icon"
                    className="px-3 py-2 border border-border-default text-text-dim hover:text-error hover:border-error transition-colors disabled:opacity-60 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {isUpdatingIcon && (
                <p className="font-mono text-xs text-text-dim">Updating icon...</p>
              )}
              {iconError && (
                <p className="font-mono text-xs text-error">{iconError}</p>
              )}
            </section>

            {/* GitHub Integration section */}
            <div className="mt-10">
              <GitHubIntegration slug={slug} />
            </div>
          </>
        )}
        {!isLoading && !plugin && (
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
