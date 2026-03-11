"use client";

import { useCallback, useSyncExternalStore } from "react";

export type ViewMode = "list" | "grid";

const STORAGE_KEY = "pumpkin-hub:explorer-view";
const DEFAULT_VIEW: ViewMode = "list";

const listeners = new Set<() => void>();

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

function getSnapshot(): ViewMode {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "list" || stored === "grid") return stored;
  return DEFAULT_VIEW;
}

function getServerSnapshot(): ViewMode {
  return DEFAULT_VIEW;
}

export function useViewPreference() {
  const viewMode = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setViewMode = useCallback((mode: ViewMode) => {
    localStorage.setItem(STORAGE_KEY, mode);
    emitChange();
  }, []);

  return { viewMode, setViewMode } as const;
}
