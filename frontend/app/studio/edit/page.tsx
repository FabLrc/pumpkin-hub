"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { StudioLayout } from "@/components/studio/StudioLayout";
import { EditorLayout } from "@/components/studio/EditorLayout";
import { useStudioStore } from "@/components/studio/useStudioStore";
import { createStudioProject } from "@/lib/api";

export default function NewStudioProjectPage() {
  const router = useRouter();
  const reset = useStudioStore((s) => s.reset);
  const setProjectId = useStudioStore((s) => s.setProjectId);
  const setProjectName = useStudioStore((s) => s.setProjectName);

  useEffect(() => {
    reset();
    setProjectName("Nouveau projet");

    // Auto-create project for logged-in users
    const createProject = async () => {
      try {
        const result = await createStudioProject({ name: "Nouveau projet" });
        setProjectId(result.project.id);
        router.replace(`/studio/edit/${result.project.id}`, { scroll: false });
      } catch {
        // User is not logged in — work with localStorage only
        const localId = `local-${Date.now()}`;
        setProjectId(localId);
        localStorage.setItem(
          `studio-${localId}`,
          JSON.stringify({ name: "Nouveau projet", flow_data: { nodes: [], edges: [] } }),
        );
      }
    };

    createProject();
  }, [reset, setProjectId, setProjectName, router]);

  return (
    <StudioLayout editorMode>
      <EditorLayout />
    </StudioLayout>
  );
}
