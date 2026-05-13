"use client";

import { useCallback } from "react";
import { Trash2, Play, Upload } from "lucide-react";
import { useStudioStore } from "./useStudioStore";

export function Toolbar() {
  const {
    projectName,
    setProjectName,
    isDirty,
    isSaving,
    buildStatus,
    removeSelected,
    selectedNode,
  } = useStudioStore();

  const handleBuild = useCallback(() => {
    // TODO Phase 3: trigger build via API
    console.log("Build triggered");
  }, []);

  const handlePublish = useCallback(() => {
    // TODO Phase 4: redirect to publish form
    console.log("Publish flow");
  }, []);

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
