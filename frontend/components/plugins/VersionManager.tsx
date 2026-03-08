"use client";

import { useState } from "react";
import { AlertTriangle, RotateCcw, Undo2 } from "lucide-react";
import { yankVersion } from "@/lib/api";
import type { VersionResponse } from "@/lib/types";

interface VersionManagerProps {
  slug: string;
  version: VersionResponse;
  onMutated: () => void;
}

export function VersionManager({
  slug,
  version,
  onMutated,
}: VersionManagerProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const nextYanked = !version.is_yanked;
  const actionLabel = nextYanked ? "Yank" : "Restore";
  const ActionIcon = nextYanked ? AlertTriangle : Undo2;

  async function handleToggleYank() {
    setIsLoading(true);
    try {
      await yankVersion(slug, version.version, { yanked: nextYanked });
      onMutated();
    } finally {
      setIsLoading(false);
      setShowConfirm(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        disabled={isLoading}
        className={`font-mono text-[10px] px-2 py-1 border transition-colors cursor-pointer flex items-center gap-1 ${
          nextYanked
            ? "border-error/30 text-error/70 hover:border-error hover:text-error"
            : "border-green-500/30 text-green-500/70 hover:border-green-500 hover:text-green-500"
        } disabled:opacity-50 disabled:cursor-not-allowed`}
        title={nextYanked ? "Yank this version" : "Restore this version"}
      >
        <ActionIcon className="w-3 h-3" />
        {actionLabel}
      </button>

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-sm border border-border-default bg-bg-elevated p-6 mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div
                className={`w-10 h-10 border flex items-center justify-center ${
                  nextYanked
                    ? "bg-error/10 border-error/30"
                    : "bg-green-500/10 border-green-500/30"
                }`}
              >
                {nextYanked ? (
                  <AlertTriangle className="w-5 h-5 text-error" />
                ) : (
                  <RotateCcw className="w-5 h-5 text-green-500" />
                )}
              </div>
              <div>
                <h2 className="font-raleway font-bold text-lg text-text-primary">
                  {nextYanked ? "Yank Version" : "Restore Version"}
                </h2>
                <p className="font-mono text-[10px] text-text-dim">
                  v{version.version}
                </p>
              </div>
            </div>

            <p className="font-mono text-xs text-text-muted mb-6">
              {nextYanked
                ? "Yanking hides this version from new installations. Existing users are not affected."
                : "Restoring makes this version available for installation again."}
            </p>

            <div className="flex items-center gap-3 justify-end">
              <button
                onClick={() => setShowConfirm(false)}
                disabled={isLoading}
                className="font-mono text-xs border border-border-default text-text-dim hover:text-text-primary px-4 py-2 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleToggleYank}
                disabled={isLoading}
                className={`font-mono text-xs font-bold px-4 py-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${
                  nextYanked
                    ? "bg-error hover:bg-error/80 text-black"
                    : "bg-green-500 hover:bg-green-500/80 text-black"
                }`}
              >
                {isLoading
                  ? "Processing…"
                  : nextYanked
                    ? "Yank Version"
                    : "Restore Version"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
