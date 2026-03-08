// ── API Types ─────────────────────────────────────────────────────────────
// Mirror of the Rust API DTOs for type-safe frontend consumption.

export interface UserProfile {
  id: string;
  username: string;
  display_name: string | null;
  email: string | null;
  avatar_url: string | null;
  bio: string | null;
  role: "author" | "moderator" | "admin";
  created_at: string;
}

// ── Auth Request Types ────────────────────────────────────────────────────

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

/** Supported OAuth providers for the sign-in page. */
export type OAuthProvider = "github" | "google" | "discord";

export interface AuthorSummary {
  id: string;
  username: string;
  avatar_url: string | null;
}

export interface CategorySummary {
  id: string;
  name: string;
  slug: string;
}

/** Full category as returned by GET /api/v1/categories. */
export interface CategoryResponse {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  created_at: string;
}

export interface PluginSummary {
  id: string;
  author: AuthorSummary;
  name: string;
  slug: string;
  short_description: string | null;
  license: string | null;
  downloads_total: number;
  categories: CategorySummary[];
  created_at: string;
  updated_at: string;
}

export interface PluginResponse {
  id: string;
  author: AuthorSummary;
  name: string;
  slug: string;
  short_description: string | null;
  description: string | null;
  repository_url: string | null;
  documentation_url: string | null;
  license: string | null;
  downloads_total: number;
  categories: CategorySummary[];
  created_at: string;
  updated_at: string;
}

export interface PaginationMeta {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

// ── Plugin Mutation Types ──────────────────────────────────────────────────

export interface CreatePluginRequest {
  name: string;
  short_description?: string;
  description?: string;
  repository_url?: string;
  documentation_url?: string;
  license?: string;
  category_ids?: string[];
}

export interface UpdatePluginRequest {
  name?: string;
  short_description?: string;
  description?: string;
  repository_url?: string;
  documentation_url?: string;
  license?: string;
  category_ids?: string[];
}

// ── Version Types ─────────────────────────────────────────────────────────

export interface VersionResponse {
  id: string;
  version: string;
  changelog: string | null;
  pumpkin_version_min: string | null;
  pumpkin_version_max: string | null;
  downloads: number;
  is_yanked: boolean;
  published_at: string;
}

export interface VersionsListResponse {
  plugin_slug: string;
  total: number;
  versions: VersionResponse[];
}

// ── Query Parameters ──────────────────────────────────────────────────────

export type SortField = "created_at" | "updated_at" | "downloads_total" | "name";
export type SortOrder = "asc" | "desc";

export interface ListPluginsParams {
  page?: number;
  per_page?: number;
  sort_by?: SortField;
  order?: SortOrder;
  category?: string;
  author?: string;
}

// ── Profile Mutation Types ─────────────────────────────────────────────────

export interface UpdateProfileRequest {
  display_name?: string;
  bio?: string;
}
