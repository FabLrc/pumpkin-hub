"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { StudioLayout } from "@/components/studio/StudioLayout";
import { EditorLayout } from "@/components/studio/EditorLayout";
import { useStudioStore } from "@/components/studio/useStudioStore";
import { getStudioProject } from "@/lib/api";

export default function EditStudioProjectPage() {
  const params = useParams();
  const projectId = params.id as string;
  const { setProjectId, loadFlow, setProjectName, projectId: storeProjectId } = useStudioStore();

  const { data, error, isLoading } = useSWR(
    projectId && !projectId.startsWith("local-") ? `studio-project-${projectId}` : null,
    () => getStudioProject(projectId),
    { revalidateOnFocus: false },
  );

  useEffect(() => {
    if (projectId && projectId !== storeProjectId) {
      setProjectId(projectId);

      // Check localStorage for guest project
      if (projectId.startsWith("local-")) {
        const raw = localStorage.getItem(`studio-${projectId}`);
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            setProjectName(parsed.name || "Nouveau projet");
            loadFlow(parsed.flow_data?.nodes || [], parsed.flow_data?.edges || []);
          } catch {
            // ignore malformed data
          }
        }
      }
    }
  }, [projectId, storeProjectId, setProjectId, setProjectName, loadFlow]);

  useEffect(() => {
    if (data) {
      setProjectName(data.project.name);
      const flowData = data.flow_data as { nodes?: unknown[]; edges?: unknown[] } | undefined;
      loadFlow(
        (flowData?.nodes as []) || [],
        (flowData?.edges as []) || [],
      );
    }
  }, [data, setProjectName, loadFlow]);

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
