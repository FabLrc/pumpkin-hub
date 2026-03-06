// ── API Types ─────────────────────────────────────────────────────────────
// Mirror of the Rust API DTOs for type-safe frontend consumption.

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

// ── Query Parameters ──────────────────────────────────────────────────────

export type SortField = "created_at" | "updated_at" | "downloads_total" | "name";
export type SortOrder = "asc" | "desc";

export interface ListPluginsParams {
  page?: number;
  per_page?: number;
  sort_by?: SortField;
  order?: SortOrder;
  category?: string;
}
