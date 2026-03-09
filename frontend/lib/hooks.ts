"use client";

// ── SWR Hooks ─────────────────────────────────────────────────────────────
// Typed React hooks for data fetching with SWR (stale-while-revalidate).

import useSWR from "swr";
import { swrFetcher, getPluginsPath, getPluginPath, getPluginVersionsPath, getCategoriesPath, getAuthMePath, getBinariesPath } from "./api";
import type {
  BinariesListResponse,
  CategoryResponse,
  ListPluginsParams,
  PaginatedResponse,
  PluginResponse,
  PluginSummary,
  UserProfile,
  VersionsListResponse,
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

export function usePluginVersions(slug: string | null) {
  const path = slug ? getPluginVersionsPath(slug) : null;
  return useSWR<VersionsListResponse>(path, swrFetcher, {
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

/** Fetch all binary artifacts for a specific plugin version. */
export function useBinaries(slug: string | null, version: string | null) {
  const path = slug && version ? getBinariesPath(slug, version) : null;
  return useSWR<BinariesListResponse>(path, swrFetcher, {
    revalidateOnFocus: false,
  });
}
