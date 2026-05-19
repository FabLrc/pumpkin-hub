"use client";

import type { ReactNode } from "react";
import { useCurrentUser } from "@/lib/hooks";
import { useStudioStore } from "./useStudioStore";

interface StudioLayoutProps {
  children?: ReactNode;
  editorMode?: boolean;
}

export function StudioLayout({ children, editorMode = false }: StudioLayoutProps) {
  const isTutorialActive = useStudioStore((s) => s.isTutorialActive);
  const { data: user, isLoading } = useCurrentUser();
  const showGuestBanner = !isLoading && !user;

  return (
    <div className="flex flex-col h-screen bg-[#0f0f1a]">
      {showGuestBanner && (
        <div className="bg-[#f97316]/20 border-b border-[#f97316]/30 px-4 py-1.5 text-xs text-[#f97316] text-center flex-shrink-0">
          Mode invité — connectez-vous pour activer la sauvegarde automatique et la compilation.
        </div>
      )}

      {isTutorialActive && (
        <div className="bg-[#a855f7]/20 border-b border-[#a855f7]/30 px-4 py-1.5 text-xs text-[#a855f7] text-center flex-shrink-0">
          Mode tutoriel actif
        </div>
      )}

      {editorMode ? children : (
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      )}
    </div>
  );
}
