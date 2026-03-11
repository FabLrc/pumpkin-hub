"use client";

import { useState, useCallback, useEffect } from "react";

export type ViewMode = "list" | "grid";

const STORAGE_KEY = "pumpkin-hub:explorer-view";
const DEFAULT_VIEW: ViewMode = "list";

function readStoredPreference(): ViewMode {
  if (typeof window === "undefined") return DEFAULT_VIEW;

  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "list" || stored === "grid") return stored;

  return DEFAULT_VIEW;
}

export function useViewPreference() {
  const [viewMode, setViewModeState] = useState<ViewMode>(DEFAULT_VIEW);

  useEffect(() => {
    setViewModeState(readStoredPreference());
  }, []);

  const setViewMode = useCallback((mode: ViewMode) => {
    setViewModeState(mode);
    localStorage.setItem(STORAGE_KEY, mode);
  }, []);

  return { viewMode, setViewMode } as const;
}
