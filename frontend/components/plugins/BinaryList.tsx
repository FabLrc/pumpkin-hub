"use client";

import { useState } from "react";
import { Download, Shield, Copy, Check } from "lucide-react";
import type { BinaryResponse, BinaryDownloadResponse } from "@/lib/types";
import { fetchBinaryDownload } from "@/lib/api";

interface BinaryListProps {
  readonly slug: string;
  readonly version: string;
  readonly binaries: BinaryResponse[];
}

export function BinaryList({ slug, version, binaries }: BinaryListProps) {
  if (binaries.length === 0) {
    return (
      <p className="font-mono text-xs text-text-muted">
        No binaries uploaded yet.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {binaries.map((binary) => (
        <BinaryCard
          key={binary.id}
          slug={slug}
          version={version}
          binary={binary}
        />
      ))}
    </div>
  );
}

function BinaryCard({
  slug,
  version,
  binary,
}: {
  readonly slug: string;
  readonly version: string;
  readonly binary: BinaryResponse;
}) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [checksumCopied, setChecksumCopied] = useState(false);

  async function handleDownload() {
    setIsDownloading(true);
    try {
      const response: BinaryDownloadResponse = await fetchBinaryDownload(
        slug,
        version,
      );
      // Open the pre-signed URL in a new tab to trigger download
      globalThis.open(response.download_url, "_blank", "noopener,noreferrer");
    } catch {
      // Silently fail — the user will see the download didn't start
    } finally {
      setIsDownloading(false);
    }
  }

  async function handleCopyChecksum() {
    await navigator.clipboard.writeText(binary.checksum_sha256);
    setChecksumCopied(true);
    setTimeout(() => setChecksumCopied(false), 2000);
  }

  return (
    <div className="border border-border-default bg-bg-elevated/30 p-3 flex items-center justify-between gap-4">
      {/* Left: file info */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 border border-border-hover flex items-center justify-center flex-shrink-0">
          <span className="font-mono text-[10px] text-accent font-bold">WASM</span>
        </div>
        <div className="min-w-0">
          <div className="font-mono text-xs text-text-primary flex items-center gap-2">
            <span className="font-bold truncate">{binary.file_name}</span>
          </div>
          <div className="font-mono text-xs text-text-muted flex items-center gap-2 mt-0.5">
            <span>{formatFileSize(binary.file_size)}</span>
            <span>·</span>
            <button
              type="button"
              onClick={handleCopyChecksum}
              className="inline-flex items-center gap-1 hover:text-text-subtle transition-colors cursor-pointer"
              title="Copy SHA-256 checksum"
            >
              <Shield className="w-2.5 h-2.5" />
              <span className="truncate max-w-[120px]">
                {binary.checksum_sha256.slice(0, 16)}…
              </span>
              {checksumCopied ? (
                <Check className="w-2.5 h-2.5 text-green-500" />
              ) : (
                <Copy className="w-2.5 h-2.5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Right: download button */}
      <button
        type="button"
        onClick={handleDownload}
        disabled={isDownloading}
        className="font-mono text-xs border border-accent/50 text-accent hover:bg-accent/10 px-3 py-1.5 flex items-center gap-1.5 transition-colors cursor-pointer flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Download className="w-3 h-3" />
        {isDownloading ? "…" : "Download"}
      </button>
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
