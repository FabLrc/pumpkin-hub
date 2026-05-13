"use client";

import { useEffect, useState } from "react";
import { useStudioStore } from "./useStudioStore";

interface StudioLayoutProps {
  children?: React.ReactNode;
  editorMode?: boolean;
}

export function StudioLayout({ children, editorMode = false }: StudioLayoutProps) {
  const isTutorialActive = useStudioStore((s) => s.isTutorialActive);
  const [showGuestBanner, setShowGuestBanner] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080"}/api/v1/auth/me`,
          { credentials: "include" },
        );
        setShowGuestBanner(!res.ok);
      } catch {
        setShowGuestBanner(true);
      }
    };
    checkAuth();
  }, []);

  return (
    <div className="flex flex-col h-screen bg-[#0f0f1a]">
      {showGuestBanner && (
        <div className="bg-[#f97316]/20 border-b border-[#f97316]/30 px-4 py-1.5 text-xs text-[#f97316] text-center flex-shrink-0">
          Vous n&apos;êtes pas connecté. Vos modifications ne seront pas sauvegardées.
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
