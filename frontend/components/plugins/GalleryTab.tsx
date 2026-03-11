"use client";

import { useState, useCallback } from "react";
import { Image as ImageIcon, Film, Trash2, Loader2 } from "lucide-react";
import { mutate } from "swr";
import type { PluginResponse, MediaResponse } from "@/lib/types";
import { useMedia, useCurrentUser } from "@/lib/hooks";
import { deleteMedia, getMediaPath } from "@/lib/api";
import { MediaUpload } from "@/components/plugins/MediaUpload";
import { Lightbox } from "@/components/plugins/Lightbox";

interface GalleryTabProps {
  plugin: PluginResponse;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function GalleryTab({ plugin }: GalleryTabProps) {
  const { data, isLoading } = useMedia(plugin.slug);
  const { data: currentUser } = useCurrentUser();
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const isOwner =
    currentUser?.id === plugin.author.id || currentUser?.role === "admin";

  const mediaItems = data?.media ?? [];

  const handleDelete = useCallback(
    async (item: MediaResponse) => {
      if (!confirm(`Delete "${item.file_name}"? This cannot be undone.`)) return;

      setDeletingId(item.id);
      try {
        await deleteMedia(plugin.slug, item.id);
        mutate(getMediaPath(plugin.slug));
      } catch {
        // Error will show in console
      } finally {
        setDeletingId(null);
      }
    },
    [plugin.slug],
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-text-dim">
        <Loader2 size={20} className="animate-spin mr-2" />
        <span className="font-mono text-xs">Loading gallery...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Upload section (owners only) */}
      {isOwner && <MediaUpload pluginSlug={plugin.slug} />}

      {/* Empty state */}
      {mediaItems.length === 0 && (
        <div className="text-center py-16 border border-border-default bg-bg-elevated">
          <ImageIcon size={32} className="mx-auto mb-3 text-text-dim" />
          <p className="text-text-muted font-mono text-sm">
            No media items yet
          </p>
          {isOwner && (
            <p className="text-text-dim font-mono text-xs mt-1">
              Upload images or videos to showcase your plugin
            </p>
          )}
        </div>
      )}

      {/* Gallery grid */}
      {mediaItems.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {mediaItems.map((item, index) => (
            <GalleryCard
              key={item.id}
              item={item}
              isOwner={isOwner}
              isDeleting={deletingId === item.id}
              onView={() => setLightboxIndex(index)}
              onDelete={() => handleDelete(item)}
            />
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <Lightbox
          media={mediaItems}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </div>
  );
}

// ── Gallery Card ──────────────────────────────────────────────────────────

interface GalleryCardProps {
  item: MediaResponse;
  isOwner: boolean;
  isDeleting: boolean;
  onView: () => void;
  onDelete: () => void;
}

function GalleryCard({
  item,
  isOwner,
  isDeleting,
  onView,
  onDelete,
}: GalleryCardProps) {
  return (
    <div className="group relative border border-border-default bg-bg-elevated hover:border-border-hover transition-colors overflow-hidden">
      {/* Thumbnail / Preview */}
      <button
        onClick={onView}
        className="block w-full aspect-video overflow-hidden cursor-pointer"
        aria-label={`View ${item.file_name}`}
      >
        {item.media_type === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element -- user-uploaded media with unknown dimensions from external storage
          <img
            src={item.thumbnail_url ?? item.url}
            alt={item.caption ?? item.file_name}
            className="w-full h-full object-cover transition-transform group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-bg-surface flex items-center justify-center relative">
            <Film size={32} className="text-text-dim" />
            <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-bg-base/80 font-mono text-[10px] text-text-muted">
              VIDEO
            </div>
          </div>
        )}
      </button>

      {/* Info bar */}
      <div className="px-2 py-1.5 border-t border-border-default">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            {item.media_type === "image" ? (
              <ImageIcon size={10} className="text-text-dim flex-shrink-0" />
            ) : (
              <Film size={10} className="text-text-dim flex-shrink-0" />
            )}
            <span className="font-mono text-[10px] text-text-dim truncate">
              {item.caption ?? item.file_name}
            </span>
          </div>
          <span className="font-mono text-[10px] text-text-dim flex-shrink-0">
            {formatFileSize(item.file_size)}
          </span>
        </div>
      </div>

      {/* Owner actions overlay */}
      {isOwner && (
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            disabled={isDeleting}
            className="p-1.5 bg-bg-base/80 border border-border-default hover:border-error text-text-muted hover:text-error transition-colors cursor-pointer disabled:opacity-50"
            aria-label="Delete media"
          >
            {isDeleting ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Trash2 size={12} />
            )}
          </button>
        </div>
      )}
    </div>
  );
}
