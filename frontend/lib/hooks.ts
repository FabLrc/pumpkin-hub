"use client";

// ── SWR Hooks ─────────────────────────────────────────────────────────────
// Typed React hooks for data fetching with SWR (stale-while-revalidate).

import useSWR from "swr";
import { swrFetcher, getPluginsPath, getPluginPath, getCategoriesPath, getAuthMePath } from "./api";
import type {
  CategoryResponse,
  ListPluginsParams,
  PaginatedResponse,
  PluginResponse,
  PluginSummary,
  UserProfile,
} from "./types";

export function usePlugins(params: ListPluginsParams = {}) {
  const path = getPluginsPath(params);
  return useSWR<PaginatedResponse<PluginSummary>>(path, swrFetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 5000,
  });
}

export function usePlugin(slug: string | null) {
  const path = slug ? getPluginPath(slug) : null;
  return useSWR<PluginResponse>(path, swrFetcher, {
    revalidateOnFocus: false,
  });
}

export function useCategories() {
  return useSWR<CategoryResponse[]>(getCategoriesPath(), swrFetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 30_000,
  });
}

export function useCurrentUser() {
  return useSWR<UserProfile>(getAuthMePath(), swrFetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 10_000,
    shouldRetryOnError: false,
  });
}

/** Fetch all plugins published by the given author username. */
export function useAuthorPlugins(username: string | null) {
  const path = username ? getPluginsPath({ author: username, per_page: 100 }) : null;
  return useSWR<PaginatedResponse<PluginSummary>>(path, swrFetcher, {
    revalidateOnFocus: false,
  });
}
