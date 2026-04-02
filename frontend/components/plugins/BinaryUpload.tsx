"use client";

import { useState, useRef } from "react";
import { Upload, CheckCircle, AlertTriangle, X } from "lucide-react";
import type { BinaryUploadResponse } from "@/lib/types";
import { uploadBinary } from "@/lib/api";

interface BinaryUploadProps {
  readonly slug: string;
  readonly version: string;
  readonly hasBinary: boolean;
  readonly onUploaded: () => void;
}

const MAX_FILE_SIZE_MB = 100;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export function BinaryUpload({
  slug,
  version,
  hasBinary,
  onUploaded,
}: BinaryUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BinaryUploadResponse | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setError(null);
    setResult(null);

    if (!file) {
      setSelectedFile(null);
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError(`File size exceeds ${MAX_FILE_SIZE_MB} MB limit`);
      setSelectedFile(null);
      return;
    }

    if (file.size === 0) {
      setError("File must not be empty");
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  }

  function handleReset() {
    setSelectedFile(null);
    setUploadProgress(0);
    setError(null);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleUpload() {
    if (!selectedFile) return;

    setIsUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      const response = await uploadBinary(
        slug,
        version,
        selectedFile,
        setUploadProgress,
      );
      setResult(response);
      onUploaded();
      handleReset();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Upload failed. Please try again.";
      setError(message);
    } finally {
      setIsUploading(false);
    }
  }

  if (hasBinary) {
    return (
      <div className="border border-border-default bg-bg-elevated/30 p-4">
        <p className="font-mono text-xs text-text-dim flex items-center gap-2">
          <CheckCircle className="w-3.5 h-3.5 text-green-500" />
          A binary has already been uploaded for this version.
        </p>
      </div>
    );
  }

  return (
    <div className="border border-border-default bg-bg-elevated p-5 space-y-4">
      <h4 className="font-mono text-xs text-text-primary uppercase tracking-widest">
        Upload Binary
      </h4>

      {/* File input */}
      <div>
        <label htmlFor="binary-file-input" className="font-mono text-xs text-text-muted uppercase tracking-widest block mb-2">
          WebAssembly File (.wasm)
        </label>
        <div className="relative">
          <input
            id="binary-file-input"
            ref={fileInputRef}
            type="file"
            accept=".wasm"
            onChange={handleFileSelect}
            disabled={isUploading}
            aria-label="Select .wasm binary file"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <div
            className={`border border-dashed border-border-default p-4 flex items-center gap-3 transition-colors ${
              isUploading ? "opacity-50" : "hover:border-border-hover"
            }`}
          >
            <Upload className="w-4 h-4 text-text-dim flex-shrink-0" />
            <span className="font-mono text-xs text-text-dim">
              {selectedFile
                ? `${selectedFile.name} (${formatFileSize(selectedFile.size)})`
                : "Choose a .wasm file or drag it here"}
            </span>
            {selectedFile && !isUploading && (
              <button
                type="button"
                title="Clear selected file"
                onClick={(e) => {
                  e.stopPropagation();
                  handleReset();
                }}
                className="ml-auto text-text-dim hover:text-text-subtle cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
        <p className="font-mono text-[10px] text-text-dim mt-1">
          Max {MAX_FILE_SIZE_MB} MB · .wasm
        </p>
      </div>

      {/* Upload progress */}
      {isUploading && (
        <div>
          <progress
            className="w-full h-1"
            value={uploadProgress}
            max={100}
            aria-label="Upload progress"
          />
          <p className="font-mono text-[10px] text-text-dim mt-1">
            Uploading… {uploadProgress}%
          </p>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="flex items-start gap-2 border border-red-500/30 bg-red-500/5 p-3">
          <AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="font-mono text-xs text-red-400">{error}</p>
        </div>
      )}

      {/* Success message */}
      {result && (
        <div className="flex items-start gap-2 border border-green-500/30 bg-green-500/5 p-3">
          <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0 mt-0.5" />
          <div className="font-mono text-xs text-green-400">
            <p>Binary uploaded successfully.</p>
            <p className="text-text-dim mt-1">
              SHA-256: <code className="text-text-subtle">{result.binary.checksum_sha256}</code>
            </p>
          </div>
        </div>
      )}

      {/* Submit button */}
      <button
        type="button"
        onClick={handleUpload}
        disabled={!selectedFile || isUploading}
        className="font-mono text-xs bg-accent hover:bg-accent-dark text-black font-bold px-5 py-2.5 transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Upload className="w-3.5 h-3.5" />
        {isUploading ? "Uploading…" : "Upload Binary"}
      </button>
    </div>
  );
}

/** Formats bytes into a human-readable string (KB, MB, GB). */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
