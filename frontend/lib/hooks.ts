"use client";

// ── SWR Hooks ─────────────────────────────────────────────────────────────
// Typed React hooks for data fetching with SWR (stale-while-revalidate).

import useSWR from "swr";
import { swrFetcher, getPluginsPath, getPluginPath, getPluginVersionsPath, getCategoriesPath, getAuthMePath, getBinariesPath, getSearchPath, getPumpkinVersionsPath, getDependenciesPath, getDependencyGraphPath, getDependantsPath } from "./api";
import type {
  BinariesListResponse,
  CategoryResponse,
  DependencyGraphResponse,
  DependencyListResponse,
  ListPluginsParams,
  PaginatedResponse,
  PluginResponse,
  PluginSummary,
  PumpkinVersion,
  ReverseDependencyResponse,
  SearchParams,
  SearchResponse,
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

/** Full-text search across plugins with faceted filters and sorting. */
export function useSearch(params: SearchParams) {
  const path = getSearchPath(params);
  return useSWR<SearchResponse>(path, swrFetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 2000,
    keepPreviousData: true,
  });
}

/** Fetch all known Pumpkin MC versions from the official GitHub repo. */
export function usePumpkinVersions() {
  return useSWR<PumpkinVersion[]>(getPumpkinVersionsPath(), swrFetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60_000,
  });
}

// ── Dependency Hooks ──────────────────────────────────────────────────────

/** Fetch dependencies for a specific plugin version. */
export function useDependencies(slug: string | null, version: string | null) {
  const path = slug && version ? getDependenciesPath(slug, version) : null;
  return useSWR<DependencyListResponse>(path, swrFetcher, {
    revalidateOnFocus: false,
  });
}

/** Fetch the full dependency graph with conflict detection. */
export function useDependencyGraph(slug: string | null, version: string | null) {
  const path = slug && version ? getDependencyGraphPath(slug, version) : null;
  return useSWR<DependencyGraphResponse>(path, swrFetcher, {
    revalidateOnFocus: false,
  });
}

/** Fetch reverse dependencies: "who depends on this plugin?" */
export function useDependants(slug: string | null) {
  const path = slug ? getDependantsPath(slug) : null;
  return useSWR<ReverseDependencyResponse>(path, swrFetcher, {
    revalidateOnFocus: false,
  });
}
