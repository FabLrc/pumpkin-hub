// ── API Client ────────────────────────────────────────────────────────────
// Centralised fetch wrapper for the Pumpkin Hub REST API.

import type {
  AdminPluginEntry,
  AdminStatsResponse,
  AdminUserEntry,
  AuditLogEntry,
  AuthorProfileResponse,
  BinariesListResponse,
  BinaryDownloadResponse,
  BinaryUploadResponse,
  CategoryResponse,
  CreatePluginRequest,
  CreateVersionRequest,
  DeclareDependencyRequest,
  DependencyGraphResponse,
  DependencyListResponse,
  DependencyResponse,
  ListPluginsParams,
  LoginRequest,
  OAuthProvider,
  PaginatedResponse,
  PluginResponse,
  PluginSummary,
  PumpkinVersion,
  RegisterRequest,
  ReverseDependencyResponse,
  SearchParams,
  SearchResponse,
  SearchSuggestion,
  UpdateDependencyRequest,
  UpdatePluginRequest,
  UpdateProfileRequest,
  UserProfile,
  VersionResponse,
  VersionsListResponse,
  YankVersionRequest,
  CreateReportRequest,
  CreateReviewRequest,
  ReportResponse,
  ReviewListResponse,
  ReviewResponse,
  UpdateReviewRequest,
  ChangelogResponse,
  MediaListResponse,
  MediaResponse,
  MediaUploadResponse,
  ReorderMediaRequest,
  UpdateChangelogRequest,
  UpdateMediaRequest,
} from "./types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

const API_PREFIX = `${API_BASE_URL}/api/v1`;

// ── Generic Fetcher ───────────────────────────────────────────────────────

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_PREFIX}${path}`, {
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    ...init,
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "Unknown error");
    throw new Error(`API ${response.status}: ${errorBody}`);
  }

  return response.json() as Promise<T>;
}

// ── SWR-compatible fetcher ────────────────────────────────────────────────

export function swrFetcher<T>(path: string): Promise<T> {
  return apiFetch<T>(path);
}

// ── Plugin Endpoints ──────────────────────────────────────────────────────

function buildPluginQueryString(params: ListPluginsParams): string {
  const searchParams = new URLSearchParams();

  if (params.page) searchParams.set("page", String(params.page));
  if (params.per_page) searchParams.set("per_page", String(params.per_page));
  if (params.sort_by) searchParams.set("sort_by", params.sort_by);
  if (params.order) searchParams.set("order", params.order);
  if (params.category) searchParams.set("category", params.category);
  if (params.author) searchParams.set("author", params.author);

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : "";
}

export function getPublicStatsPath(): string {
  return "/stats";
}

export function getPluginsPath(params: ListPluginsParams = {}): string {
  return `/plugins${buildPluginQueryString(params)}`;
}

export function getPluginPath(slug: string): string {
  return `/plugins/${slug}`;
}

export async function fetchPlugins(
  params: ListPluginsParams = {},
): Promise<PaginatedResponse<PluginSummary>> {
  return apiFetch<PaginatedResponse<PluginSummary>>(getPluginsPath(params));
}

export async function fetchPlugin(slug: string): Promise<PluginResponse> {
  return apiFetch<PluginResponse>(getPluginPath(slug));
}

export async function createPlugin(
  body: CreatePluginRequest,
): Promise<PluginResponse> {
  return apiFetch<PluginResponse>("/plugins", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updatePlugin(
  slug: string,
  body: UpdatePluginRequest,
): Promise<PluginResponse> {
  return apiFetch<PluginResponse>(`/plugins/${encodeURIComponent(slug)}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function deletePlugin(slug: string): Promise<void> {
  await apiFetch<void>(`/plugins/${encodeURIComponent(slug)}`, {
    method: "DELETE",
  });
}

export function getPluginIconPath(slug: string): string {
  return `/plugins/${encodeURIComponent(slug)}/icon`;
}

export async function uploadPluginIcon(
  slug: string,
  file: File,
): Promise<PluginResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_PREFIX}${getPluginIconPath(slug)}`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "Unknown error");
    throw new Error(`API ${response.status}: ${errorBody}`);
  }

  return response.json() as Promise<PluginResponse>;
}

export async function deletePluginIcon(slug: string): Promise<void> {
  const response = await fetch(`${API_PREFIX}${getPluginIconPath(slug)}`, {
    method: "DELETE",
    credentials: "include",
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "Unknown error");
    throw new Error(`API ${response.status}: ${errorBody}`);
  }
}

// ── Version Endpoints ─────────────────────────────────────────────────────

export function getPluginVersionsPath(slug: string): string {
  return `/plugins/${slug}/versions`;
}

export async function fetchPluginVersions(
  slug: string,
): Promise<VersionsListResponse> {
  return apiFetch<VersionsListResponse>(getPluginVersionsPath(slug));
}

export function getPluginVersionPath(slug: string, version: string): string {
  return `/plugins/${encodeURIComponent(slug)}/versions/${encodeURIComponent(version)}`;
}

export async function fetchPluginVersion(
  slug: string,
  version: string,
): Promise<VersionResponse> {
  return apiFetch<VersionResponse>(getPluginVersionPath(slug, version));
}

export async function createVersion(
  slug: string,
  body: CreateVersionRequest,
): Promise<VersionResponse> {
  return apiFetch<VersionResponse>(
    `/plugins/${encodeURIComponent(slug)}/versions`,
    {
      method: "POST",
      body: JSON.stringify(body),
    },
  );
}

export async function yankVersion(
  slug: string,
  version: string,
  body: YankVersionRequest,
): Promise<VersionResponse> {
  return apiFetch<VersionResponse>(
    `/plugins/${encodeURIComponent(slug)}/versions/${encodeURIComponent(version)}/yank`,
    {
      method: "PATCH",
      body: JSON.stringify(body),
    },
  );
}

// ── Category Endpoints ────────────────────────────────────────────────────

export function getCategoriesPath(): string {
  return "/categories";
}

export async function fetchCategories(): Promise<CategoryResponse[]> {
  return apiFetch<CategoryResponse[]>(getCategoriesPath());
}

// ── Auth Endpoints ────────────────────────────────────────────────────────

/** Full URL for an OAuth provider login redirect (server-side redirect). */
export function getOAuthLoginUrl(provider: OAuthProvider): string {
  return `${API_PREFIX}/auth/${provider}`;
}

/** @deprecated Use getOAuthLoginUrl("github") instead. */
export function getGithubLoginUrl(): string {
  return getOAuthLoginUrl("github");
}

export function getAuthMePath(): string {
  return "/auth/me";
}

export async function logout(): Promise<void> {
  await apiFetch<{ message: string }>("/auth/logout", { method: "POST" });
}

export async function fetchCurrentUser(): Promise<UserProfile> {
  return apiFetch<UserProfile>(getAuthMePath());
}

/** Update the authenticated user's profile. */
export async function updateProfile(
  body: UpdateProfileRequest,
): Promise<UserProfile> {
  return apiFetch<UserProfile>("/auth/me", {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

/**
 * Upload a new avatar image for the authenticated user.
 * Uses multipart/form-data — do NOT set Content-Type manually (browser adds boundary).
 */
export async function uploadAvatar(file: File): Promise<UserProfile> {
  const formData = new FormData();
  formData.append("avatar", file);

  const response = await fetch(`${API_PREFIX}/auth/avatar`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "Unknown error");
    throw new Error(`API ${response.status}: ${errorBody}`);
  }

  return response.json() as Promise<UserProfile>;
}

/** Register a new account with email and password. */
export async function registerWithEmail(
  body: RegisterRequest,
): Promise<UserProfile> {
  return apiFetch<UserProfile>("/auth/register", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/** Log in with email and password. */
export async function loginWithEmail(
  body: LoginRequest,
): Promise<UserProfile> {
  return apiFetch<UserProfile>("/auth/login", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/** Request a password reset email. */
export async function forgotPassword(email: string): Promise<{ message: string }> {
  return apiFetch<{ message: string }>("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

/** Reset password using a reset token. */
export async function resetPassword(
  token: string,
  newPassword: string,
): Promise<{ message: string }> {
  return apiFetch<{ message: string }>("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ token, new_password: newPassword }),
  });
}

/** Verify email address using a verification token. */
export async function verifyEmail(token: string): Promise<{ message: string }> {
  return apiFetch<{ message: string }>("/auth/verify-email", {
    method: "POST",
    body: JSON.stringify({ token }),
  });
}

/** Resend email verification (requires auth). */
export async function resendVerification(): Promise<{ message: string }> {
  return apiFetch<{ message: string }>("/auth/resend-verification", {
    method: "POST",
  });
}

// ── Binary Endpoints ──────────────────────────────────────────────────────

export function getBinariesPath(slug: string, version: string): string {
  return `/plugins/${encodeURIComponent(slug)}/versions/${encodeURIComponent(version)}/binaries`;
}

export async function fetchBinaries(
  slug: string,
  version: string,
): Promise<BinariesListResponse> {
  return apiFetch<BinariesListResponse>(getBinariesPath(slug, version));
}

/**
 * Upload a binary artifact for a specific plugin version.
 * Uses multipart/form-data — do NOT set Content-Type manually (browser adds boundary).
 */
export async function uploadBinary(
  slug: string,
  version: string,
  file: File,
  platform: string,
  onProgress?: (progress: number) => void,
): Promise<BinaryUploadResponse> {
  const formData = new FormData();
  formData.append("platform", platform);
  formData.append("file", file);

  // Use XMLHttpRequest for upload progress tracking
  return new Promise<BinaryUploadResponse>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_PREFIX}${getBinariesPath(slug, version)}`);
    xhr.withCredentials = true;

    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText) as BinaryUploadResponse);
      } else {
        reject(new Error(`API ${xhr.status}: ${xhr.responseText}`));
      }
    });

    xhr.addEventListener("error", () => {
      reject(new Error("Network error during binary upload"));
    });

    xhr.send(formData);
  });
}

export async function fetchBinaryDownload(
  slug: string,
  version: string,
  platform: string,
): Promise<BinaryDownloadResponse> {
  return apiFetch<BinaryDownloadResponse>(
    `/plugins/${encodeURIComponent(slug)}/versions/${encodeURIComponent(version)}/download?platform=${encodeURIComponent(platform)}`,
  );
}

// ── Search Endpoints ──────────────────────────────────────────────────────

function buildSearchQueryString(params: SearchParams): string {
  const searchParams = new URLSearchParams();

  if (params.q) searchParams.set("q", params.q);
  if (params.category) searchParams.set("category", params.category);
  if (params.platform) searchParams.set("platform", params.platform);
  if (params.pumpkin_version)
    searchParams.set("pumpkin_version", params.pumpkin_version);
  if (params.sort) searchParams.set("sort", params.sort);
  if (params.page) searchParams.set("page", String(params.page));
  if (params.per_page) searchParams.set("per_page", String(params.per_page));

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : "";
}

export function getSearchPath(params: SearchParams = {}): string {
  return `/search${buildSearchQueryString(params)}`;
}

export async function fetchSearch(
  params: SearchParams = {},
): Promise<SearchResponse> {
  return apiFetch<SearchResponse>(getSearchPath(params));
}

export function getSuggestPath(query: string, limit?: number): string {
  const params = new URLSearchParams({ q: query });
  if (limit) params.set("limit", String(limit));
  return `/search/suggest?${params.toString()}`;
}

export async function fetchSuggestions(
  query: string,
  limit?: number,
): Promise<SearchSuggestion[]> {
  return apiFetch<SearchSuggestion[]>(getSuggestPath(query, limit));
}

export function getPumpkinVersionsPath(): string {
  return "/pumpkin-versions";
}

export async function fetchPumpkinVersions(): Promise<PumpkinVersion[]> {
  return apiFetch<PumpkinVersion[]>(getPumpkinVersionsPath());
}

// ── Dependency Endpoints ──────────────────────────────────────────────────

export function getDependenciesPath(slug: string, version: string): string {
  return `/plugins/${encodeURIComponent(slug)}/versions/${encodeURIComponent(version)}/dependencies`;
}

export function getDependencyGraphPath(slug: string, version: string): string {
  return `/plugins/${encodeURIComponent(slug)}/versions/${encodeURIComponent(version)}/dependencies/graph`;
}

export function getDependantsPath(slug: string): string {
  return `/plugins/${encodeURIComponent(slug)}/dependants`;
}

export async function fetchDependencies(
  slug: string,
  version: string,
): Promise<DependencyListResponse> {
  return apiFetch<DependencyListResponse>(getDependenciesPath(slug, version));
}

export async function declareDependency(
  slug: string,
  version: string,
  body: DeclareDependencyRequest,
): Promise<DependencyResponse> {
  return apiFetch<DependencyResponse>(getDependenciesPath(slug, version), {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateDependency(
  slug: string,
  version: string,
  dependencyId: string,
  body: UpdateDependencyRequest,
): Promise<DependencyResponse> {
  return apiFetch<DependencyResponse>(
    `${getDependenciesPath(slug, version)}/${encodeURIComponent(dependencyId)}`,
    {
      method: "PUT",
      body: JSON.stringify(body),
    },
  );
}

export async function removeDependency(
  slug: string,
  version: string,
  dependencyId: string,
): Promise<void> {
  await apiFetch<void>(
    `${getDependenciesPath(slug, version)}/${encodeURIComponent(dependencyId)}`,
    { method: "DELETE" },
  );
}

export async function fetchDependencyGraph(
  slug: string,
  version: string,
): Promise<DependencyGraphResponse> {
  return apiFetch<DependencyGraphResponse>(
    getDependencyGraphPath(slug, version),
  );
}

export async function fetchDependants(
  slug: string,
): Promise<ReverseDependencyResponse> {
  return apiFetch<ReverseDependencyResponse>(getDependantsPath(slug));
}

// ── Author Profile Endpoints ──────────────────────────────────────────────

export function getAuthorProfilePath(username: string): string {
  return `/users/${encodeURIComponent(username)}`;
}

export async function fetchAuthorProfile(
  username: string,
): Promise<AuthorProfileResponse> {
  return apiFetch<AuthorProfileResponse>(getAuthorProfilePath(username));
}

export function getAuthorPluginsPath(
  username: string,
  page?: number,
  perPage?: number,
): string {
  const params = new URLSearchParams();
  if (page) params.set("page", String(page));
  if (perPage) params.set("per_page", String(perPage));
  const queryString = params.toString();
  return `/users/${encodeURIComponent(username)}/plugins${queryString ? `?${queryString}` : ""}`;
}

export async function fetchAuthorPlugins(
  username: string,
  page?: number,
  perPage?: number,
): Promise<PaginatedResponse<PluginSummary>> {
  return apiFetch<PaginatedResponse<PluginSummary>>(
    getAuthorPluginsPath(username, page, perPage),
  );
}

// ── Admin Endpoints ───────────────────────────────────────────────────────

export async function fetchAdminStats(): Promise<AdminStatsResponse> {
  return apiFetch<AdminStatsResponse>("/admin/stats");
}

export async function fetchAdminPlugins(
  page?: number,
  perPage?: number,
  search?: string,
): Promise<PaginatedResponse<AdminPluginEntry>> {
  const params = new URLSearchParams();
  if (page) params.set("page", String(page));
  if (perPage) params.set("per_page", String(perPage));
  if (search) params.set("search", search);
  const qs = params.toString();
  return apiFetch<PaginatedResponse<AdminPluginEntry>>(
    `/admin/plugins${qs ? `?${qs}` : ""}`,
  );
}

export async function deactivatePlugin(pluginId: string): Promise<void> {
  await apiFetch<unknown>(`/admin/plugins/${pluginId}/deactivate`, {
    method: "POST",
  });
}

export async function reactivatePlugin(pluginId: string): Promise<void> {
  await apiFetch<unknown>(`/admin/plugins/${pluginId}/reactivate`, {
    method: "POST",
  });
}

export async function fetchAdminUsers(
  page?: number,
  perPage?: number,
  search?: string,
): Promise<PaginatedResponse<AdminUserEntry>> {
  const params = new URLSearchParams();
  if (page) params.set("page", String(page));
  if (perPage) params.set("per_page", String(perPage));
  if (search) params.set("search", search);
  const qs = params.toString();
  return apiFetch<PaginatedResponse<AdminUserEntry>>(
    `/admin/users${qs ? `?${qs}` : ""}`,
  );
}

export async function changeUserRole(
  userId: string,
  role: string,
): Promise<void> {
  await apiFetch<unknown>(`/admin/users/${userId}/role`, {
    method: "PATCH",
    body: JSON.stringify({ role }),
  });
}

export async function deactivateUser(userId: string): Promise<void> {
  await apiFetch<unknown>(`/admin/users/${userId}/deactivate`, {
    method: "POST",
  });
}

export async function reactivateUser(userId: string): Promise<void> {
  await apiFetch<unknown>(`/admin/users/${userId}/reactivate`, {
    method: "POST",
  });
}

export async function fetchAuditLogs(
  page?: number,
  perPage?: number,
): Promise<PaginatedResponse<AuditLogEntry>> {
  const params = new URLSearchParams();
  if (page) params.set("page", String(page));
  if (perPage) params.set("per_page", String(perPage));
  const qs = params.toString();
  return apiFetch<PaginatedResponse<AuditLogEntry>>(
    `/admin/audit-logs${qs ? `?${qs}` : ""}`,
  );
}

// ── Dashboard Analytics Endpoints ─────────────────────────────────────────

function buildStatsQueryString(
  granularity?: string,
  periods?: number,
): string {
  const params = new URLSearchParams();
  if (granularity) params.set("granularity", granularity);
  if (periods) params.set("periods", String(periods));
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export function getDashboardStatsPath(
  granularity?: string,
  periods?: number,
): string {
  return `/dashboard/stats${buildStatsQueryString(granularity, periods)}`;
}

export function getDashboardDownloadsPath(
  granularity?: string,
  periods?: number,
): string {
  return `/dashboard/downloads${buildStatsQueryString(granularity, periods)}`;
}

export function getPluginDownloadStatsPath(
  slug: string,
  granularity?: string,
  periods?: number,
): string {
  return `/plugins/${encodeURIComponent(slug)}/download-stats${buildStatsQueryString(granularity, periods)}`;
}

// ── API Key Endpoints ─────────────────────────────────────────────────────

export function getApiKeysPath(): string {
  return "/api-keys";
}

export async function createApiKey(
  body: import("./types").CreateApiKeyRequest,
): Promise<import("./types").CreateApiKeyResponse> {
  return apiFetch<import("./types").CreateApiKeyResponse>("/api-keys", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function revokeApiKey(id: string): Promise<void> {
  await apiFetch<unknown>(`/api-keys/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

// ── Notification Endpoints ────────────────────────────────────────────────

export function getNotificationsPath(
  page?: number,
  perPage?: number,
  unreadOnly?: boolean,
): string {
  const params = new URLSearchParams();
  if (page) params.set("page", String(page));
  if (perPage) params.set("per_page", String(perPage));
  if (unreadOnly) params.set("unread_only", "true");
  const qs = params.toString();
  return `/notifications${qs ? `?${qs}` : ""}`;
}

export function getUnreadCountPath(): string {
  return "/notifications/unread-count";
}

export async function markNotificationRead(
  id: string,
): Promise<import("./types").NotificationItem> {
  return apiFetch<import("./types").NotificationItem>(
    `/notifications/${encodeURIComponent(id)}/read`,
    { method: "PATCH" },
  );
}

export async function markAllNotificationsRead(): Promise<void> {
  await apiFetch<unknown>("/notifications/read-all", { method: "POST" });
}

// ── GitHub Integration ────────────────────────────────────────────────────

export function getGithubLinkPath(slug: string): string {
  return `/plugins/${encodeURIComponent(slug)}/github`;
}

export function getPluginBadgeUrl(slug: string): string {
  return `${API_PREFIX}/plugins/${encodeURIComponent(slug)}/badge.svg`;
}

export async function linkGithub(
  slug: string,
  body: import("./types").LinkGitHubRequest,
): Promise<import("./types").GitHubLinkResponse> {
  return apiFetch<import("./types").GitHubLinkResponse>(
    `/plugins/${encodeURIComponent(slug)}/github/link`,
    { method: "POST", body: JSON.stringify(body) },
  );
}

export async function unlinkGithub(slug: string): Promise<void> {
  await apiFetch<unknown>(
    `/plugins/${encodeURIComponent(slug)}/github`,
    { method: "DELETE" },
  );
}

export function getInstallationReposPath(installationId: number): string {
  return `/github/installations/${installationId}/repositories`;
}

/** Lists all repositories accessible to a GitHub App installation. */
export async function listInstallationRepos(
  installationId: number,
): Promise<import("./types").InstallationRepositoriesResponse> {
  return apiFetch<import("./types").InstallationRepositoriesResponse>(
    getInstallationReposPath(installationId),
  );
}

/** Creates a new plugin by importing metadata from a GitHub repository. */
export async function publishPluginFromGithub(
  body: import("./types").PublishFromGithubRequest,
): Promise<import("./types").PublishFromGithubResponse> {
  return apiFetch<import("./types").PublishFromGithubResponse>("/plugins/from-github", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/** SWR key for the user's GitHub repositories. */
export function getMyGithubReposPath(): string {
  return "/github/my-repositories";
}

/** Lists all repositories the current user can access via the Pumpkin Hub GitHub App. */
export async function listMyGithubRepos(): Promise<import("./types").MyRepositoriesResponse> {
  return apiFetch<import("./types").MyRepositoriesResponse>(getMyGithubReposPath());
}

// ── Review Endpoints ─────────────────────────────────────────────────────

export function getReviewsPath(
  slug: string,
  page?: number,
  perPage?: number,
): string {
  const params = new URLSearchParams();
  if (page) params.set("page", String(page));
  if (perPage) params.set("per_page", String(perPage));
  const qs = params.toString();
  return `/plugins/${encodeURIComponent(slug)}/reviews${qs ? `?${qs}` : ""}`;
}

export async function fetchReviews(
  slug: string,
  page?: number,
  perPage?: number,
): Promise<ReviewListResponse> {
  return apiFetch<ReviewListResponse>(getReviewsPath(slug, page, perPage));
}

export async function createReview(
  slug: string,
  body: CreateReviewRequest,
): Promise<ReviewResponse> {
  return apiFetch<ReviewResponse>(
    `/plugins/${encodeURIComponent(slug)}/reviews`,
    { method: "POST", body: JSON.stringify(body) },
  );
}

export async function updateReview(
  slug: string,
  reviewId: string,
  body: UpdateReviewRequest,
): Promise<ReviewResponse> {
  return apiFetch<ReviewResponse>(
    `/plugins/${encodeURIComponent(slug)}/reviews/${encodeURIComponent(reviewId)}`,
    { method: "PUT", body: JSON.stringify(body) },
  );
}

export async function deleteReview(
  slug: string,
  reviewId: string,
): Promise<void> {
  await apiFetch<void>(
    `/plugins/${encodeURIComponent(slug)}/reviews/${encodeURIComponent(reviewId)}`,
    { method: "DELETE" },
  );
}

export async function toggleReviewVisibility(
  slug: string,
  reviewId: string,
  hidden: boolean,
): Promise<void> {
  await apiFetch<unknown>(
    `/plugins/${encodeURIComponent(slug)}/reviews/${encodeURIComponent(reviewId)}/hide`,
    { method: "PATCH", body: JSON.stringify({ hidden }) },
  );
}

export async function reportReview(
  slug: string,
  reviewId: string,
  body: CreateReportRequest,
): Promise<ReportResponse> {
  return apiFetch<ReportResponse>(
    `/plugins/${encodeURIComponent(slug)}/reviews/${encodeURIComponent(reviewId)}/report`,
    { method: "POST", body: JSON.stringify(body) },
  );
}

// ── Media Gallery Endpoints ───────────────────────────────────────────────

export function getMediaPath(slug: string): string {
  return `/plugins/${encodeURIComponent(slug)}/media`;
}

export async function fetchMedia(
  slug: string,
): Promise<MediaListResponse> {
  return apiFetch<MediaListResponse>(getMediaPath(slug));
}

export async function uploadMedia(
  slug: string,
  file: File,
  caption?: string,
  onProgress?: (percent: number) => void,
): Promise<MediaUploadResponse> {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append("file", file);
    if (caption) formData.append("caption", caption);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_PREFIX}${getMediaPath(slug)}`);
    xhr.withCredentials = true;

    if (onProgress) {
      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          onProgress(Math.round((event.loaded / event.total) * 100));
        }
      });
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText) as MediaUploadResponse);
        } catch {
          reject(new Error("Upload failed: invalid server response"));
        }
      } else {
        reject(new Error(`Upload failed: ${xhr.status} ${xhr.responseText}`));
      }
    };

    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.onabort = () => reject(new Error("Upload was cancelled"));
    xhr.send(formData);
  });
}

export async function updateMedia(
  slug: string,
  mediaId: string,
  body: UpdateMediaRequest,
): Promise<MediaResponse> {
  return apiFetch<MediaResponse>(
    `/plugins/${encodeURIComponent(slug)}/media/${encodeURIComponent(mediaId)}`,
    { method: "PATCH", body: JSON.stringify(body) },
  );
}

export async function deleteMedia(
  slug: string,
  mediaId: string,
): Promise<void> {
  await apiFetch<void>(
    `/plugins/${encodeURIComponent(slug)}/media/${encodeURIComponent(mediaId)}`,
    { method: "DELETE" },
  );
}

export async function reorderMedia(
  slug: string,
  body: ReorderMediaRequest,
): Promise<void> {
  await apiFetch<void>(
    `/plugins/${encodeURIComponent(slug)}/media/reorder`,
    { method: "PUT", body: JSON.stringify(body) },
  );
}

// ── Changelog Endpoints ───────────────────────────────────────────────────

export function getChangelogPath(slug: string): string {
  return `/plugins/${encodeURIComponent(slug)}/changelog`;
}

export async function fetchChangelog(
  slug: string,
): Promise<ChangelogResponse> {
  return apiFetch<ChangelogResponse>(getChangelogPath(slug));
}

export async function updateChangelog(
  slug: string,
  body: UpdateChangelogRequest,
): Promise<ChangelogResponse> {
  return apiFetch<ChangelogResponse>(getChangelogPath(slug), {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function deleteChangelog(slug: string): Promise<void> {
  await apiFetch<void>(getChangelogPath(slug), { method: "DELETE" });
}
