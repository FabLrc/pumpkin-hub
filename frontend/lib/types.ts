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
  email_verified: boolean;
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

export interface AuthorProfileResponse {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  role: string;
  plugin_count: number;
  total_downloads: number;
  created_at: string;
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
  display_order: number;
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
  average_rating: number;
  review_count: number;
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
  average_rating: number;
  review_count: number;
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

// ── Version Mutation Types ────────────────────────────────────────────────

export interface CreateVersionRequest {
  version: string;
  changelog?: string;
  pumpkin_version_min?: string;
  pumpkin_version_max?: string;
}

export interface YankVersionRequest {
  yanked: boolean;
}

// ── Binary Types ──────────────────────────────────────────────────────────

/** Supported target OS platforms for plugin binaries. */
export type Platform = "windows" | "macos" | "linux";

export const PLATFORMS: Platform[] = ["windows", "macos", "linux"];

export interface BinaryResponse {
  id: string;
  platform: string;
  file_name: string;
  file_size: number;
  checksum_sha256: string;
  content_type: string;
  uploaded_at: string;
}

export interface BinariesListResponse {
  plugin_slug: string;
  version: string;
  total: number;
  binaries: BinaryResponse[];
}

export interface BinaryUploadResponse {
  binary: BinaryResponse;
  download_url: string;
}

export interface BinaryDownloadResponse {
  download_url: string;
  file_name: string;
  file_size: number;
  checksum_sha256: string;
  platform: string;
  expires_in_seconds: number;
}

// ── Dependency Types ──────────────────────────────────────────────────────

export interface DependencyPluginSummary {
  id: string;
  name: string;
  slug: string;
}

export interface DependencyResponse {
  id: string;
  dependency_plugin: DependencyPluginSummary;
  version_req: string;
  is_optional: boolean;
  created_at: string;
}

export interface DependencyListResponse {
  plugin_slug: string;
  version: string;
  total: number;
  dependencies: DependencyResponse[];
}

export interface DeclareDependencyRequest {
  dependency_plugin_id: string;
  version_req: string;
  is_optional?: boolean;
}

export interface UpdateDependencyRequest {
  version_req?: string;
  is_optional?: boolean;
}

/** A node in the full dependency graph. */
export interface DependencyGraphNode {
  plugin_id: string;
  plugin_name: string;
  plugin_slug: string;
  version: string;
  version_id: string;
  dependencies: DependencyGraphEdge[];
}

/** An edge in the dependency graph. */
export interface DependencyGraphEdge {
  dependency_plugin_id: string;
  dependency_plugin_name: string;
  dependency_plugin_slug: string;
  version_req: string;
  is_optional: boolean;
  resolved_version: string | null;
  is_compatible: boolean;
}

export type ConflictType =
  | "no_matching_version"
  | "incompatible_ranges"
  | "circular_dependency"
  | "inactive_plugin";

export interface DependencyConflict {
  dependency_plugin_id: string;
  dependency_plugin_name: string;
  dependency_plugin_slug: string;
  conflict_type: ConflictType;
  details: string;
}

export interface DependencyGraphResponse {
  plugin_slug: string;
  version: string;
  graph: DependencyGraphNode[];
  conflicts: DependencyConflict[];
}

export interface ReverseDependant {
  plugin_id: string;
  plugin_name: string;
  plugin_slug: string;
  version: string;
  version_req: string;
  is_optional: boolean;
}

export interface ReverseDependencyResponse {
  plugin_slug: string;
  total: number;
  dependants: ReverseDependant[];
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

// ── Search Types ──────────────────────────────────────────────────────────

export interface SearchHit {
  id: string;
  name: string;
  slug: string;
  short_description: string | null;
  author_username: string;
  license: string | null;
  downloads_total: number;
  categories: string[];
  category_slugs: string[];
  platforms: string[];
  pumpkin_versions: string[];
  created_at_timestamp: number;
  updated_at_timestamp: number;
  average_rating: number;
  review_count: number;
}

export interface FacetDistribution {
  categories: Record<string, number>;
  platforms: Record<string, number>;
  pumpkin_versions: Record<string, number>;
}

export interface SearchResponse {
  hits: SearchHit[];
  query: string;
  processing_time_ms: number;
  estimated_total_hits: number | null;
  facet_distribution: FacetDistribution | null;
  page: number;
  per_page: number;
}

export interface SearchParams {
  q?: string;
  category?: string;
  platform?: string;
  pumpkin_version?: string;
  sort?: string;
  page?: number;
  per_page?: number;
}

export interface SearchSuggestion {
  name: string;
  slug: string;
}

export interface PumpkinVersion {
  version: string;
  tag_name: string;
  published_at: string | null;
}

export type SearchSortOption =
  | "relevance"
  | "downloads"
  | "newest"
  | "oldest"
  | "updated"
  | "name_asc"
  | "name_desc";

// ── Admin Types ───────────────────────────────────────────────────────────

export interface AdminStatsResponse {
  total_users: number;
  total_plugins: number;
  total_downloads: number;
  active_plugins: number;
  deactivated_plugins: number;
  recent_audit_logs: AuditLogEntry[];
}

export interface AdminPluginEntry {
  id: string;
  name: string;
  slug: string;
  author_username: string;
  downloads_total: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AdminUserEntry {
  id: string;
  username: string;
  display_name: string | null;
  email: string | null;
  role: string;
  is_active: boolean;
  plugin_count: number;
  created_at: string;
}

export interface AuditLogEntry {
  id: string;
  actor_username: string;
  action: string;
  target_type: string;
  target_id: string;
  details: Record<string, unknown> | null;
  created_at: string;
}

// ── Dashboard Analytics Types ─────────────────────────────────────────────

export interface DownloadDataPoint {
  period: string;
  downloads: number;
}

export interface TopPlugin {
  name: string;
  slug: string;
  downloads_total: number;
}

export interface AuthorDashboardStats {
  total_plugins: number;
  total_downloads: number;
  downloads_last_30_days: number;
  downloads_last_7_days: number;
  downloads_trend_percent: number;
  most_downloaded_plugin: TopPlugin | null;
  recent_downloads: DownloadDataPoint[];
}

export interface VersionDownloadSummary {
  version: string;
  downloads: number;
  published_at: string;
}

export interface PluginDownloadStats {
  plugin_slug: string;
  total_downloads: number;
  downloads_last_30_days: number;
  downloads_last_7_days: number;
  downloads_trend_percent: number;
  chart: DownloadDataPoint[];
  by_version: VersionDownloadSummary[];
}

export type DownloadGranularity = "daily" | "weekly" | "monthly";

// ── Public Stats ──────────────────────────────────────────────────────────

export interface PublicStats {
  total_plugins: number;
  total_authors: number;
  total_downloads: number;
}

// ── API Keys ──────────────────────────────────────────────────────────────

export interface ApiKeySummary {
  id: string;
  name: string;
  key_prefix: string;
  permissions: string[];
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
}

export interface CreateApiKeyRequest {
  name: string;
  permissions: string[];
  expires_at?: string;
}

export interface CreateApiKeyResponse extends ApiKeySummary {
  key: string;
}

// ── Notification Types ────────────────────────────────────────────────────

export interface NotificationItem {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

export interface NotificationListResponse {
  notifications: NotificationItem[];
  total: number;
  unread: number;
}

export interface UnreadCountResponse {
  count: number;
}

// ── GitHub Integration ────────────────────────────────────────────────────

export interface LinkGitHubRequest {
  installation_id: number;
  repository_owner: string;
  repository_name: string;
  sync_readme?: boolean;
  sync_changelog?: boolean;
  auto_publish?: boolean;
}

export interface GitHubLinkResponse {
  id: string;
  plugin_id: string;
  installation_id: number;
  repository_owner: string;
  repository_name: string;
  repository_full_name: string;
  default_branch: string;
  sync_readme: boolean;
  sync_changelog: boolean;
  auto_publish: boolean;
  last_webhook_at: string | null;
  created_at: string;
}

/** A repository returned by the GitHub App installation list. */
export interface GitHubRepository {
  full_name: string;
  owner: string;
  name: string;
  default_branch: string;
  description: string | null;
}

export interface InstallationRepositoriesResponse {
  installation_id: number;
  repositories: GitHubRepository[];
}

/** Request body for publishing a new plugin from a GitHub repository. */
export interface PublishFromGithubRequest {
  installation_id: number;
  repository_owner: string;
  repository_name: string;
  plugin_name?: string;
  short_description?: string;
  category_ids?: string[];
  sync_readme?: boolean;
  sync_changelog?: boolean;
  auto_publish?: boolean;
}

export interface PublishFromGithubResponse {
  plugin_slug: string;
  github_link: GitHubLinkResponse;
}

/** A repository returned by `GET /github/my-repositories`, includes resolved installation_id. */
export interface MyGithubRepository {
  installation_id: number;
  full_name: string;
  owner: string;
  name: string;
  default_branch: string;
  description: string | null;
}

export interface MyRepositoriesResponse {
  repositories: MyGithubRepository[];
}

// ── Review Types ─────────────────────────────────────────────────────────────

export interface ReviewAuthorSummary {
  id: string;
  username: string;
  avatar_url: string | null;
}

export interface ReviewResponse {
  id: string;
  plugin_id: string;
  author: ReviewAuthorSummary;
  rating: number;
  title: string | null;
  body: string | null;
  is_hidden: boolean;
  created_at: string;
  updated_at: string;
}

export interface RatingDistribution {
  star_1: number;
  star_2: number;
  star_3: number;
  star_4: number;
  star_5: number;
}

export interface ReviewListResponse {
  reviews: ReviewResponse[];
  total: number;
  average_rating: number;
  rating_distribution: RatingDistribution;
}

export interface CreateReviewRequest {
  rating: number;
  title?: string;
  body?: string;
}

export interface UpdateReviewRequest {
  rating?: number;
  title?: string;
  body?: string;
}

export type ReportReason =
  | "spam"
  | "harassment"
  | "hate_speech"
  | "misinformation"
  | "other";

export interface CreateReportRequest {
  reason: ReportReason;
  details?: string;
}

export interface ReportResponse {
  id: string;
  review_id: string;
  reporter_id: string;
  reason: string;
  details: string | null;
  status: string;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
}

export interface ReportListResponse {
  reports: ReportResponse[];
  total: number;
}

// ── Media Gallery Types ───────────────────────────────────────────────────

export type MediaType = "image" | "video";

export interface MediaResponse {
  id: string;
  media_type: MediaType;
  file_name: string;
  file_size: number;
  content_type: string;
  url: string;
  thumbnail_url: string | null;
  caption: string | null;
  sort_order: number;
  uploaded_at: string;
}

export interface MediaListResponse {
  plugin_slug: string;
  total: number;
  media: MediaResponse[];
}

export interface MediaUploadResponse {
  media: MediaResponse;
}

export interface UpdateMediaRequest {
  caption?: string;
  sort_order?: number;
}

export interface ReorderMediaRequest {
  media_ids: string[];
}

// ── Changelog Types ───────────────────────────────────────────────────────

export interface ChangelogResponse {
  plugin_slug: string;
  content: string;
  source: "github" | "manual";
  updated_at: string;
}

export interface UpdateChangelogRequest {
  content: string;
}
