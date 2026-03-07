// ── API Client ────────────────────────────────────────────────────────────
// Centralised fetch wrapper for the Pumpkin Hub REST API.

import type {
  CategoryResponse,
  CreatePluginRequest,
  ListPluginsParams,
  LoginRequest,
  OAuthProvider,
  PaginatedResponse,
  PluginResponse,
  PluginSummary,
  RegisterRequest,
  UpdatePluginRequest,
  UserProfile,
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

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : "";
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

export function getLogoutUrl(): string {
  return `${API_PREFIX}/auth/logout`;
}

export async function fetchCurrentUser(): Promise<UserProfile> {
  return apiFetch<UserProfile>(getAuthMePath());
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
