"use client";

import { useCallback, useRef, useEffect } from "react";
import { Trash2, Play, Upload } from "lucide-react";
import { toast } from "sonner";
import { useStudioStore } from "./useStudioStore";
import { triggerStudioBuild, getStudioPublishData } from "@/lib/api";

const POLL_INITIAL_MS = 2000;
const POLL_MAX_MS = 30000;
const POLL_TIMEOUT_MS = 120000;

export function Toolbar() {
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollCountRef = useRef(0);

  const cancelPoll = useCallback(() => {
    if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    pollTimerRef.current = null;
    pollCountRef.current = 0;
  }, []);

  // Cleanup polling on unmount
  useEffect(() => cancelPoll, [cancelPoll]);

  const {
    projectName,
    setProjectName,
    isDirty,
    isSaving,
    buildStatus,
    buildErrorMessage,
    projectId,
    removeSelected,
    selectedNode,
    setBuildStatus,
    setBuildErrorMessage,
    setBuildId,
  } = useStudioStore();

  const startPolling = useCallback(
    (buildId: string) => {
      pollCountRef.current = 0;

      const poll = () => {
        pollCountRef.current += 1;
        const elapsed = pollCountRef.current * POLL_INITIAL_MS;
        if (elapsed >= POLL_TIMEOUT_MS) {
          setBuildStatus("failed");
          setBuildErrorMessage("Le build a expiré");
          toast.error("Le build a expiré");
          return;
        }

        const delay = Math.min(POLL_INITIAL_MS * Math.pow(1.5, pollCountRef.current - 1), POLL_MAX_MS);

        pollTimerRef.current = setTimeout(async () => {
          try {
            const res = await fetch(
              `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080"}/api/v1/studio/builds/${buildId}`,
              { credentials: "include" },
            );
            const status = await res.json();
            if (status.status === "success") {
              setBuildStatus("success");
              toast.success("Compilation réussie !");
            } else if (status.status === "failed") {
              setBuildStatus("failed");
              setBuildErrorMessage(status.error_message || "Échec de la compilation");
              toast.error("Échec de la compilation");
            } else if (status.status === "running") {
              setBuildStatus("running");
              poll(); // continue polling
            } else {
              poll(); // queued or other, keep polling
            }
          } catch {
            setBuildStatus("failed");
            setBuildErrorMessage("Erreur réseau pendant le build");
            toast.error("Erreur réseau pendant le build");
          }
        }, delay);
      };

      poll();
    },
    [setBuildStatus, setBuildErrorMessage],
  );

  const handleBuild = useCallback(async () => {
    if (!projectId || projectId.startsWith("local-")) {
      toast.error("Connectez-vous pour compiler un projet");
      return;
    }
    cancelPoll();
    setBuildStatus("queued");
    setBuildErrorMessage(null);
    try {
      const result = await triggerStudioBuild(projectId);
      setBuildId(result.build_id);
      toast.success("Build ajouté à la file d'attente");
      startPolling(result.build_id);
    } catch (err: unknown) {
      setBuildStatus("failed");
      setBuildErrorMessage(err instanceof Error ? err.message : "Échec de la compilation");
      toast.error("Échec de la compilation");
    }
  }, [projectId, cancelPoll, setBuildStatus, setBuildErrorMessage, setBuildId, startPolling]);

  const handlePublish = useCallback(async () => {
    if (!projectId || projectId.startsWith("local-")) {
      toast.error("Connectez-vous pour publier un projet");
      return;
    }
    try {
      const data = await getStudioPublishData(projectId);
      const params = new URLSearchParams({
        studio_project: projectId,
        studio_build: data.build_id,
        name: data.project_name,
      });
      window.location.href = `/plugins/new?${params}`;
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Impossible de publier");
    }
  }, [projectId]);

  const statusIndicator = () => {
    if (isSaving) return <span className="text-yellow-400 text-[10px]">Sauvegarde...</span>;
    if (isDirty) return <span className="text-[#a3a3a3] text-[10px]">Modifications non sauvegardées</span>;
    return <span className="text-[#22c55e] text-[10px]">Sauvegardé</span>;
  };

  return (
    <div className="h-10 bg-[#0a0a0a] border-b border-[#262626] flex items-center justify-between px-3 flex-shrink-0">
      <div className="flex items-center gap-3">
        <input
          type="text"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          className="bg-transparent border-none text-sm text-[#e5e5e5] font-semibold 
                     focus:outline-none w-48 placeholder:text-[#555]"
          placeholder="Nom du projet"
        />
        {statusIndicator()}
        {buildStatus !== "idle" && (
          <span className={`text-[10px] ${
            buildStatus === "failed" ? "text-red-400" :
            buildStatus === "success" ? "text-[#22c55e]" :
            buildStatus === "running" ? "text-yellow-400" :
            "text-[#a3a3a3]"
          }`}>
            Build: {buildStatus}
            {buildErrorMessage && ` — ${buildErrorMessage}`}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={removeSelected}
          disabled={!selectedNode}
          className="p-1.5 text-[#a3a3a3] hover:text-red-400 disabled:opacity-30 
                     disabled:cursor-not-allowed transition-colors"
          title="Supprimer le nœud sélectionné"
        >
          <Trash2 size={14} />
        </button>

        <div className="w-px h-4 bg-[#262626] mx-1" />

        <button
          onClick={handleBuild}
          disabled={buildStatus === "running" || buildStatus === "queued"}
          className="flex items-center gap-1 px-2 py-1 text-xs text-white 
                     bg-[#f97316] hover:bg-[#ea580c] disabled:opacity-50 
                     disabled:cursor-not-allowed transition-colors"
        >
          <Play size={12} />
          Compiler
        </button>

        <button
          onClick={handlePublish}
          className="flex items-center gap-1 px-2 py-1 text-xs text-white 
                     bg-[#3b82f6] hover:bg-[#2563eb] transition-colors"
        >
          <Upload size={12} />
          Publier
        </button>
      </div>
    </div>
  );
}
