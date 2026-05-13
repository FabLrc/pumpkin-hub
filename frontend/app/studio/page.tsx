"use client";

import Link from "next/link";
import { Plus, ExternalLink, FileCode2 } from "lucide-react";
import useSWR from "swr";
import { listStudioProjects } from "@/lib/api";
import { StudioLayout } from "@/components/studio/StudioLayout";
import type { ProjectSummary } from "@/lib/types";
import { useCurrentUser } from "@/lib/hooks";

function ProjectCard({ project }: { project: ProjectSummary }) {
  const statusColors: Record<string, string> = {
    draft: "text-[#a3a3a3]",
    building: "text-yellow-400",
    published: "text-[#22c55e]",
  };

  return (
    <Link
      href={`/studio/edit/${project.id}`}
      className="block p-4 bg-[#1a1a2e] border border-[#333] 
                 hover:border-[#f97316] transition-colors"
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="text-sm font-semibold text-[#e5e5e5] truncate">{project.name}</h3>
        <span className={`text-[10px] uppercase tracking-wider ${statusColors[project.status] || "text-[#666]"}`}>
          {project.status}
        </span>
      </div>
      {project.description && (
        <p className="text-xs text-[#888] mb-2 line-clamp-2">{project.description}</p>
      )}
      <div className="flex items-center gap-3 text-[10px] text-[#666]">
        <span>Builds: {project.build_count}</span>
        {project.published_plugin_id && (
          <span className="flex items-center gap-1 text-[#22c55e]">
            <ExternalLink size={10} /> Publié
          </span>
        )}
      </div>
    </Link>
  );
}

export default function StudioPage() {
  const { data: user } = useCurrentUser();
  const { data, error, isLoading } = useSWR("studio-projects", listStudioProjects);

  return (
    <StudioLayout>
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-[#e5e5e5]">PumpkinHub Studio</h1>
            <p className="text-xs text-[#888] mt-1">
              Créez des plugins Pumpkin MC sans écrire de code
            </p>
          </div>
          <Link
            href="/studio/edit/new"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold 
                       text-white bg-[#f97316] hover:bg-[#ea580c] transition-colors"
          >
            <Plus size={14} />
            Nouveau projet
          </Link>
        </div>

        {!user && (
          <div className="mb-6 p-4 bg-[#f97316]/10 border border-[#f97316]/30">
            <p className="text-xs text-[#f97316]">
              Connectez-vous pour sauvegarder vos projets sur le serveur.
            </p>
          </div>
        )}

        {isLoading && (
          <div className="text-xs text-[#666] text-center py-8">Chargement...</div>
        )}

        {error && (
          <div className="text-xs text-red-400 text-center py-8">
            Impossible de charger vos projets. Vérifiez votre connexion au serveur.
          </div>
        )}

        {data && data.projects.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FileCode2 size={48} className="text-[#333] mb-4" />
            <p className="text-sm text-[#888] mb-4">
              Vous n&apos;avez encore aucun projet.
            </p>
            <Link
              href="/studio/edit/new"
              className="px-4 py-2 text-xs font-semibold text-white 
                         bg-[#f97316] hover:bg-[#ea580c] transition-colors"
            >
              Créer votre premier projet
            </Link>
          </div>
        )}

        {data && data.projects.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </div>
    </StudioLayout>
  );
}
