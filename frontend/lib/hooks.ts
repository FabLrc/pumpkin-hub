"use client";

// ── SWR Hooks ─────────────────────────────────────────────────────────────
// Typed React hooks for data fetching with SWR (stale-while-revalidate).

import useSWR from "swr";
import {
  getApiKeysPath,
  getAuthMePath,
  getBinariesPath,
  getCategoriesPath,
  getChangelogPath,
  getDashboardDownloadsPath,
  getDashboardStatsPath,
  getDependantsPath,
  getDependenciesPath,
  getDependencyGraphPath,
  getGithubLinkPath,
  getMediaPath,
  getNotificationsPath,
  getPluginDownloadStatsPath,
  getPluginPath,
  getPluginsPath,
  getPluginVersionsPath,
  getPublicStatsPath,
  getPumpkinVersionsPath,
  getReviewsPath,
  getSearchPath,
  getServerConfigPath,
  getServerConfigsPath,
  getServerConfigSharePath,
  getUnreadCountPath,
  swrFetcher,
} from "./api";
import type {
  ApiKeySummary,
  AuthorDashboardStats,
  BinariesListResponse,
  CategoryResponse,
  ChangelogResponse,
  DependencyGraphResponse,
  DependencyListResponse,
  DownloadDataPoint,
  DownloadGranularity,
  GitHubLinkResponse,
  ListPluginsParams,
  MediaListResponse,
  NotificationListResponse,
  PaginatedResponse,
  PluginDownloadStats,
  PluginResponse,
  PluginSummary,
  PublicStats,
  PumpkinVersion,
  ReverseDependencyResponse,
  ReviewListResponse,
  SearchParams,
  SearchResponse,
  ServerConfigListResponse,
  ServerConfigResponse,
  UnreadCountResponse,
  UserProfile,
  VersionsListResponse,
} from "./types";

export function usePublicStats() {
  return useSWR<PublicStats>(getPublicStatsPath(), swrFetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60_000,
  });
}

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

export function useServerConfigs() {
  const { data, isLoading, error, mutate } = useSWR<ServerConfigListResponse>(
    getServerConfigsPath(),
    swrFetcher,
    {
      revalidateOnFocus: false,
      shouldRetryOnError: false,
    },
  );

  return {
    configs: data?.configs ?? [],
    isLoading,
    error,
    mutate,
  };
}

export function useServerConfig(id: string | null) {
  const path = id ? getServerConfigPath(id) : null;
  const { data, isLoading, error, mutate } = useSWR<ServerConfigResponse>(
    path,
    swrFetcher,
    {
      revalidateOnFocus: false,
      shouldRetryOnError: false,
    },
  );

  return {
    config: data,
    isLoading,
    error,
    mutate,
  };
}

export function useServerConfigByShare(token: string | null) {
  const path = token ? getServerConfigSharePath(token) : null;
  const { data, isLoading, error } = useSWR<ServerConfigResponse>(
    path,
    swrFetcher,
    {
      revalidateOnFocus: false,
      shouldRetryOnError: false,
    },
  );

  return {
    config: data,
    isLoading,
    error,
  };
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

// ── Dashboard Analytics Hooks ─────────────────────────────────────────────

/** Fetch advanced author dashboard KPIs with download chart data. */
export function useAuthorDashboardStats(
  granularity?: DownloadGranularity,
  periods?: number,
) {
  const path = getDashboardStatsPath(granularity, periods);
  return useSWR<AuthorDashboardStats>(path, swrFetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 10_000,
    shouldRetryOnError: false,
  });
}

/** Fetch author aggregate download chart data. */
export function useAuthorDownloads(
  granularity?: DownloadGranularity,
  periods?: number,
) {
  const path = getDashboardDownloadsPath(granularity, periods);
  return useSWR<DownloadDataPoint[]>(path, swrFetcher, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  });
}

/** Fetch per-plugin download analytics with chart. */
export function usePluginDownloadStats(
  slug: string | null,
  granularity?: DownloadGranularity,
  periods?: number,
) {
  const path = slug
    ? getPluginDownloadStatsPath(slug, granularity, periods)
    : null;
  return useSWR<PluginDownloadStats>(path, swrFetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 10_000,
  });
}

/** Fetch the authenticated user's API keys. */
export function useApiKeys() {
  return useSWR<ApiKeySummary[]>(getApiKeysPath(), swrFetcher, {
    revalidateOnFocus: false,
  });
}

// ── Notification Hooks ────────────────────────────────────────────────────

/** Fetch paginated notifications for the current user. */
export function useNotifications(
  page?: number,
  perPage?: number,
  unreadOnly?: boolean,
) {
  const path = getNotificationsPath(page, perPage, unreadOnly);
  return useSWR<NotificationListResponse>(path, swrFetcher, {
    revalidateOnFocus: true,
    refreshInterval: 30_000,
  });
}

/** Fetch the unread notification count for the bell badge. */
export function useUnreadCount() {
  return useSWR<UnreadCountResponse>(getUnreadCountPath(), swrFetcher, {
    revalidateOnFocus: true,
    refreshInterval: 30_000,
    shouldRetryOnError: false,
  });
}

// ── GitHub Integration Hooks ──────────────────────────────────────────────

/** Fetch the GitHub link status for a plugin (null when not linked). */
export function useGithubLink(slug: string | null) {
  const path = slug ? getGithubLinkPath(slug) : null;
  return useSWR<GitHubLinkResponse>(path, swrFetcher, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  });
}

// ── Review Hooks ──────────────────────────────────────────────────────────

/** Fetch paginated reviews for a plugin with rating distribution. */
export function useReviews(
  slug: string | null,
  page?: number,
  perPage?: number,
) {
  const path = slug ? getReviewsPath(slug, page, perPage) : null;
  return useSWR<ReviewListResponse>(path, swrFetcher, {
    revalidateOnFocus: false,
  });
}

// ── Media Gallery Hooks ───────────────────────────────────────────────────

/** Fetch all media items for a plugin's gallery. */
export function useMedia(slug: string | null) {
  const path = slug ? getMediaPath(slug) : null;
  return useSWR<MediaListResponse>(path, swrFetcher, {
    revalidateOnFocus: false,
  });
}

// ── Changelog Hooks ───────────────────────────────────────────────────────

/** Fetch the changelog for a plugin. */
export function useChangelog(slug: string | null) {
  const path = slug ? getChangelogPath(slug) : null;
  return useSWR<ChangelogResponse>(path, swrFetcher, {
    revalidateOnFocus: false,
  });
}
