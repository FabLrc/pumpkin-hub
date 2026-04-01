"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Pencil, Trash2, AlertTriangle } from "lucide-react";
import { useCurrentUser } from "@/lib/hooks";
import { deletePlugin, getPluginsPath } from "@/lib/api";
import { mutate } from "swr";
import type { PluginResponse } from "@/lib/types";
import { Button } from "@/components/ui/Button";

interface PluginActionsProps {
  readonly plugin: PluginResponse;
}

export function PluginActions({ plugin }: PluginActionsProps) {
  const { data: user } = useCurrentUser();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  // Only show actions to the plugin author or moderators/admins
  const canManage =
    user &&
    (user.id === plugin.author.id || user.role === "moderator" || user.role === "admin");

  if (!canManage) return null;

  async function handleDelete() {
    setIsDeleting(true);
    try {
      await deletePlugin(plugin.slug);
      await mutate(getPluginsPath());
      router.push("/explorer");
    } catch {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <Link
          href={`/plugins/${plugin.slug}/edit`}
          className="font-mono text-xs border border-border-default text-text-dim hover:border-border-hover hover:text-text-primary px-3 py-2 transition-colors flex items-center gap-2"
        >
          <Pencil className="w-3.5 h-3.5" />
          Edit
        </Link>
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="font-mono text-xs border border-border-default text-error/70 hover:border-error/50 hover:text-error px-3 py-2 transition-colors flex items-center gap-2 cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Delete
        </button>
      </div>

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={(e) => { if (e.target === e.currentTarget) setShowDeleteConfirm(false); }}
        >
          <dialog
            open
            aria-labelledby="delete-plugin-title"
            className="w-full max-w-sm border border-border-default bg-bg-elevated p-6 mx-4"
            onKeyDown={(e) => { if (e.key === "Escape") setShowDeleteConfirm(false); }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-error/10 border border-error/30 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-error" />
              </div>
              <div>
                <h2 id="delete-plugin-title" className="font-raleway font-bold text-lg text-text-primary">
                  Delete Plugin
                </h2>
                <p className="font-mono text-xs text-text-muted">
                  This action cannot be undone
                </p>
              </div>
            </div>

            <p className="font-mono text-xs text-text-muted mb-6">
              Are you sure you want to delete{" "}
              <span className="text-accent">{plugin.name}</span>? This will
              remove the plugin from the registry.
            </p>

            <div className="flex items-center gap-3 justify-end">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="font-mono text-xs bg-error hover:bg-error/80 text-black font-bold px-4 py-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isDeleting ? "Deleting…" : "Delete Plugin"}
              </button>
            </div>
          </dialog>
        </div>
      )}
    </>
  );
}
