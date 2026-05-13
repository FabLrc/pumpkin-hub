"use client";

import { useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { StudioLayout } from "@/components/studio/StudioLayout";
import { EditorLayout } from "@/components/studio/EditorLayout";
import { useStudioStore } from "@/components/studio/useStudioStore";
import { getStudioProject, updateStudioProject } from "@/lib/api";

const AUTOSAVE_DELAY_MS = 3000;

export default function EditStudioProjectPage() {
  const params = useParams();
  const projectId = params.id as string;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    setProjectId,
    loadFlow,
    setProjectName,
    markSaved,
    setSaving,
    projectId: storeProjectId,
    isDirty,
    nodes,
    edges,
    projectName,
  } = useStudioStore();

  const { data, error, isLoading } = useSWR(
    projectId && !projectId.startsWith("local-") ? `studio-project-${projectId}` : null,
    () => getStudioProject(projectId),
    { revalidateOnFocus: false },
  );

  useEffect(() => {
    if (projectId && projectId !== storeProjectId) {
      setProjectId(projectId);
      if (projectId.startsWith("local-")) {
        const raw = localStorage.getItem(`studio-${projectId}`);
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            setProjectName(parsed.name || "Nouveau projet");
            loadFlow(parsed.flow_data?.nodes || [], parsed.flow_data?.edges || []);
          } catch {
            // ignore malformed
          }
        }
      }
    }
  }, [projectId, storeProjectId, setProjectId, setProjectName, loadFlow]);

  useEffect(() => {
    if (data) {
      setProjectName(data.project.name);
      const flowData = data.flow_data as { nodes?: unknown[]; edges?: unknown[] } | undefined;
      loadFlow((flowData?.nodes as []) || [], (flowData?.edges as []) || []);
    }
  }, [data, setProjectName, loadFlow]);

  // Auto-save: debounced save when isDirty changes
  const doSave = useCallback(async () => {
    if (!projectId || projectId.startsWith("local-")) {
      localStorage.setItem(
        `studio-${projectId}`,
        JSON.stringify({
          name: projectName,
          flow_data: { nodes, edges },
        }),
      );
      markSaved();
      return;
    }
    setSaving(true);
    try {
      await updateStudioProject(projectId, {
        name: projectName,
        flow_data: { nodes: nodes as unknown as Record<string, unknown>[], edges: edges as unknown as Record<string, unknown>[] },
      });
      markSaved();
    } catch {
      setSaving(false);
    }
  }, [projectId, projectName, nodes, edges, setSaving, markSaved]);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!isDirty) return;
    timerRef.current = setTimeout(doSave, AUTOSAVE_DELAY_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isDirty, doSave]);

  // Save on tab close
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (useStudioStore.getState().isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  if (isLoading) {
    return (
      <StudioLayout editorMode>
        <div className="flex items-center justify-center h-full text-xs text-[#666]">
          Chargement du projet...
        </div>
      </StudioLayout>
    );
  }

  if (error) {
    return (
      <StudioLayout editorMode>
        <div className="flex items-center justify-center h-full text-xs text-red-400">
          Erreur : projet introuvable
        </div>
      </StudioLayout>
    );
  }

  return (
    <StudioLayout editorMode>
      <EditorLayout />
    </StudioLayout>
  );
}
