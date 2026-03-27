"use client";

import { useState, useRef } from "react";
import { Upload, X, Loader2, ImagePlus, Film } from "lucide-react";
import { uploadMedia, getMediaPath } from "@/lib/api";
import { mutate } from "swr";

interface MediaUploadProps {
  readonly pluginSlug: string;
}

const ACCEPTED_TYPES = "image/jpeg,image/png,image/webp,video/mp4,video/webm";
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100 MB

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function MediaUpload({ pluginSlug }: MediaUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate type
    if (!ACCEPTED_TYPES.split(",").includes(file.type)) {
      setError("Unsupported file type. Accepted: JPEG, PNG, WebP, MP4, WebM");
      return;
    }

    // Validate size
    const isVideo = file.type.startsWith("video/");
    const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
    if (file.size > maxSize) {
      setError(
        `File too large (${formatFileSize(file.size)}). Maximum: ${formatFileSize(maxSize)}`,
      );
      return;
    }

    setSelectedFile(file);

    // Generate preview for images
    if (file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }
  }

  function handleClear() {
    setSelectedFile(null);
    setCaption("");
    setError(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function handleUpload() {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      await uploadMedia(
        pluginSlug,
        selectedFile,
        caption || undefined,
        (percent) => setUploadProgress(percent),
      );

      // Revalidate media list
      mutate(getMediaPath(pluginSlug));
      handleClear();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      mutate(getMediaPath(pluginSlug));
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }

  return (
    <div className="border border-border-default bg-bg-elevated p-4 space-y-4">
      <div className="flex items-center gap-2 text-text-muted font-mono text-xs uppercase tracking-widest">
        <Upload size={14} />
        <span>Upload Media</span>
      </div>

      {/* File input area */}
      {selectedFile ? (
        <div className="space-y-3">
          {/* Preview */}
          <div className="relative inline-block">
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- blob URL preview from local file selection
              <img
                src={previewUrl}
                alt="Preview"
                className="max-h-48 object-contain border border-border-default"
              />
            ) : (
              <div className="h-24 w-40 bg-bg-surface border border-border-default flex items-center justify-center">
                <Film size={32} className="text-text-dim" />
              </div>
            )}
            <button
              onClick={handleClear}
              className="absolute -top-2 -right-2 p-1 bg-bg-elevated border border-border-default hover:border-error text-text-muted hover:text-error transition-colors cursor-pointer"
              aria-label="Remove file"
            >
              <X size={12} />
            </button>
          </div>

          {/* File info */}
          <div className="font-mono text-xs text-text-dim">
            {selectedFile.name} — {formatFileSize(selectedFile.size)}
          </div>

          {/* Caption input */}
          <input
            type="text"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Caption (optional)"
            maxLength={500}
            className="w-full px-3 py-2 bg-bg-surface border border-border-default text-text-secondary text-sm font-mono placeholder:text-text-dim focus:border-accent focus:outline-none"
          />

          {/* Upload button */}
          <button
            onClick={handleUpload}
            disabled={isUploading}
            className="flex items-center gap-2 px-4 py-2 bg-accent text-bg-base font-mono text-xs uppercase tracking-widest hover:bg-accent-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            {isUploading ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Uploading {uploadProgress}%</span>
              </>
            ) : (
              <>
                <Upload size={14} />
                <span>Upload</span>
              </>
            )}
          </button>

          {/* Progress bar */}
          {isUploading && (
            <div className="w-full h-1 bg-bg-surface">
              <div className="h-full w-full bg-accent animate-pulse" />
            </div>
          )}
        </div>
      ) : (
        <label
          className="flex flex-col items-center justify-center gap-3 p-8 border border-dashed border-border-default hover:border-accent cursor-pointer transition-colors"
        >
          <div className="flex gap-3 text-text-dim">
            <ImagePlus size={24} />
            <Film size={24} />
          </div>
          <span className="text-text-muted text-sm">
            Drop an image or video, or click to browse
          </span>
          <span className="text-text-dim font-mono text-xs">
            JPEG · PNG · WebP · MP4 · WebM
          </span>
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_TYPES}
            onChange={handleFileSelect}
            className="hidden"
          />
        </label>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 px-3 py-2 bg-error/10 border border-error/30 text-error text-xs font-mono">
          <X size={14} className="flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
