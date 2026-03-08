use std::collections::HashMap;

use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    Json,
};
use chrono::{DateTime, Utc};
use sqlx::{FromRow, PgPool};
use uuid::Uuid;

use crate::{auth::middleware::AuthUser, error::AppError, state::AppState};

use super::dto::{
    AuthorSummary, CategorySummary, CreatePluginRequest, ListPluginsParams, PaginatedResponse,
    PaginationMeta, PluginResponse, PluginSummary, UpdatePluginRequest, VersionResponse,
    VersionsListResponse,
};

// ── SQL Row Types ───────────────────────────────────────────────────────────

/// Plugin fields augmented by a JOIN on the users table.
#[derive(Debug, FromRow)]
struct PluginWithAuthorRow {
    id: Uuid,
    author_id: Uuid,
    name: String,
    slug: String,
    short_description: Option<String>,
    description: Option<String>,
    repository_url: Option<String>,
    documentation_url: Option<String>,
    license: Option<String>,
    downloads_total: i64,
    #[allow(dead_code)]
    is_active: bool,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
    author_username: String,
    author_avatar_url: Option<String>,
}

/// Row for batch-loading plugin → category associations.
#[derive(Debug, FromRow)]
struct PluginCategoryRow {
    plugin_id: Uuid,
    category_id: Uuid,
    category_name: String,
    category_slug: String,
}

// ── Slug Generation ─────────────────────────────────────────────────────────

/// Converts an arbitrary name into a URL-safe slug.
pub(crate) fn slugify(input: &str) -> String {
    input
        .to_lowercase()
        .chars()
        .map(|c| if c.is_ascii_alphanumeric() { c } else { '-' })
        .collect::<String>()
        .split('-')
        .filter(|s| !s.is_empty())
        .collect::<Vec<&str>>()
        .join("-")
}

/// Generates a slug that is unique across the `plugins` table.
/// Appends a numeric suffix (`-2`, `-3`, …) when the base slug already exists.
async fn generate_unique_slug(pool: &PgPool, name: &str) -> Result<String, AppError> {
    let base = slugify(name);

    let existing_slugs: Vec<String> =
        sqlx::query_scalar("SELECT slug FROM plugins WHERE slug = $1 OR slug LIKE $2")
            .bind(&base)
            .bind(format!("{base}-%"))
            .fetch_all(pool)
            .await
            .map_err(AppError::internal)?;

    if existing_slugs.is_empty() {
        return Ok(base);
    }

    // Find the highest numeric suffix among existing slugs
    let max_suffix = existing_slugs
        .iter()
        .filter_map(|s| {
            if s == &base {
                Some(1) // The base slug itself counts as suffix "1"
            } else {
                s.strip_prefix(&format!("{base}-"))
                    .and_then(|suffix| suffix.parse::<u32>().ok())
            }
        })
        .max()
        .unwrap_or(1);

    Ok(format!("{base}-{}", max_suffix + 1))
}

// ── Category Loading ────────────────────────────────────────────────────────

/// Batch-loads category associations for a set of plugin IDs.
/// Returns a map of plugin_id → Vec<CategorySummary>.
async fn load_categories_batch(
    pool: &PgPool,
    plugin_ids: &[Uuid],
) -> Result<HashMap<Uuid, Vec<CategorySummary>>, AppError> {
    if plugin_ids.is_empty() {
        return Ok(HashMap::new());
    }

    let rows: Vec<PluginCategoryRow> = sqlx::query_as(
        "SELECT pc.plugin_id,
                c.id   AS category_id,
                c.name AS category_name,
                c.slug AS category_slug
         FROM plugin_categories pc
         JOIN categories c ON pc.category_id = c.id
         WHERE pc.plugin_id = ANY($1)",
    )
    .bind(plugin_ids)
    .fetch_all(pool)
    .await
    .map_err(AppError::internal)?;

    let mut map: HashMap<Uuid, Vec<CategorySummary>> = HashMap::new();
    for row in rows {
        map.entry(row.plugin_id).or_default().push(CategorySummary {
            id: row.category_id,
            name: row.category_name,
            slug: row.category_slug,
        });
    }

    Ok(map)
}

/// Loads categories for a single plugin.
async fn load_categories_for_plugin(
    pool: &PgPool,
    plugin_id: Uuid,
) -> Result<Vec<CategorySummary>, AppError> {
    let map = load_categories_batch(pool, &[plugin_id]).await?;
    Ok(map.into_values().next().unwrap_or_default())
}

// ── Query Helpers ───────────────────────────────────────────────────────────

/// Fetches a single plugin row (with author info) by slug.
async fn fetch_plugin_by_slug(pool: &PgPool, slug: &str) -> Result<PluginWithAuthorRow, AppError> {
    sqlx::query_as(
        "SELECT p.id, p.author_id, p.name, p.slug, p.short_description,
                p.description, p.repository_url, p.documentation_url, p.license,
                p.downloads_total, p.is_active, p.created_at, p.updated_at,
                u.username AS author_username, u.avatar_url AS author_avatar_url
         FROM plugins p
         JOIN users u ON p.author_id = u.id
         WHERE p.slug = $1 AND p.is_active = true",
    )
    .bind(slug)
    .fetch_optional(pool)
    .await
    .map_err(AppError::internal)?
    .ok_or(AppError::NotFound)
}

/// Validates that every category ID in `ids` actually exists.
async fn validate_categories_exist(pool: &PgPool, ids: &[Uuid]) -> Result<(), AppError> {
    if ids.is_empty() {
        return Ok(());
    }
    let count: Option<i64> =
        sqlx::query_scalar("SELECT COUNT(*) FROM categories WHERE id = ANY($1)")
            .bind(ids)
            .fetch_one(pool)
            .await
            .map_err(AppError::internal)?;

    if count.unwrap_or(0) as usize != ids.len() {
        return Err(AppError::UnprocessableEntity(
            "One or more category IDs are invalid".to_string(),
        ));
    }
    Ok(())
}

/// Replaces all category associations for a plugin within a transaction.
async fn replace_plugin_categories(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    plugin_id: Uuid,
    category_ids: &[Uuid],
) -> Result<(), AppError> {
    sqlx::query("DELETE FROM plugin_categories WHERE plugin_id = $1")
        .bind(plugin_id)
        .execute(&mut **tx)
        .await
        .map_err(AppError::internal)?;

    if !category_ids.is_empty() {
        sqlx::query(
            "INSERT INTO plugin_categories (plugin_id, category_id)
             SELECT $1, unnest($2::uuid[])",
        )
        .bind(plugin_id)
        .bind(category_ids)
        .execute(&mut **tx)
        .await
        .map_err(AppError::internal)?;
    }

    Ok(())
}

/// Checks whether the authenticated user is allowed to modify this plugin.
pub(crate) fn require_ownership(auth: &AuthUser, plugin_author_id: Uuid) -> Result<(), AppError> {
    if auth.user_id == plugin_author_id || auth.role == "admin" {
        return Ok(());
    }
    Err(AppError::Forbidden)
}

// ── Response Builders ───────────────────────────────────────────────────────

fn build_plugin_response(
    row: PluginWithAuthorRow,
    categories: Vec<CategorySummary>,
) -> PluginResponse {
    PluginResponse {
        id: row.id,
        author: AuthorSummary {
            id: row.author_id,
            username: row.author_username,
            avatar_url: row.author_avatar_url,
        },
        name: row.name,
        slug: row.slug,
        short_description: row.short_description,
        description: row.description,
        repository_url: row.repository_url,
        documentation_url: row.documentation_url,
        license: row.license,
        downloads_total: row.downloads_total,
        categories,
        created_at: row.created_at,
        updated_at: row.updated_at,
    }
}

fn build_plugin_summary(
    row: PluginWithAuthorRow,
    categories: Vec<CategorySummary>,
) -> PluginSummary {
    PluginSummary {
        id: row.id,
        author: AuthorSummary {
            id: row.author_id,
            username: row.author_username,
            avatar_url: row.author_avatar_url,
        },
        name: row.name,
        slug: row.slug,
        short_description: row.short_description,
        license: row.license,
        downloads_total: row.downloads_total,
        categories,
        created_at: row.created_at,
        updated_at: row.updated_at,
    }
}

// ── Handlers ────────────────────────────────────────────────────────────────

/// GET /api/v1/plugins — paginated list with optional category and author filters.
pub async fn list_plugins(
    State(state): State<AppState>,
    Query(params): Query<ListPluginsParams>,
) -> Result<Json<PaginatedResponse<PluginSummary>>, AppError> {
    let pool = &state.db;
    let category_slug = params.category.clone();
    let author_username = params.author.clone();

    // Count total matching plugins
    let total: Option<i64> = sqlx::query_scalar(
        "SELECT COUNT(*)
         FROM plugins p
         JOIN users u ON p.author_id = u.id
         WHERE p.is_active = true
           AND ($1::text IS NULL OR EXISTS (
               SELECT 1 FROM plugin_categories pc
               JOIN categories c ON pc.category_id = c.id
               WHERE pc.plugin_id = p.id AND c.slug = $1
           ))
           AND ($2::text IS NULL OR u.username = $2)",
    )
    .bind(&category_slug)
    .bind(&author_username)
    .fetch_one(pool)
    .await
    .map_err(AppError::internal)?;

    let total = total.unwrap_or(0);
    let per_page = params.per_page();
    let total_pages = if total == 0 {
        0
    } else {
        ((total as f64) / (per_page as f64)).ceil() as u32
    };

    // Fetch paginated rows — sort column/direction are validated via enum
    let query = format!(
        "SELECT p.id, p.author_id, p.name, p.slug, p.short_description,
                p.description, p.repository_url, p.documentation_url, p.license,
                p.downloads_total, p.is_active, p.created_at, p.updated_at,
                u.username AS author_username, u.avatar_url AS author_avatar_url
         FROM plugins p
         JOIN users u ON p.author_id = u.id
         WHERE p.is_active = true
           AND ($1::text IS NULL OR EXISTS (
               SELECT 1 FROM plugin_categories pc
               JOIN categories c ON pc.category_id = c.id
               WHERE pc.plugin_id = p.id AND c.slug = $1
           ))
           AND ($2::text IS NULL OR u.username = $2)
         ORDER BY {} {}
         LIMIT $3 OFFSET $4",
        params.sort_column(),
        params.sort_direction(),
    );

    let rows: Vec<PluginWithAuthorRow> = sqlx::query_as(&query)
        .bind(&category_slug)
        .bind(&author_username)
        .bind(per_page as i64)
        .bind(params.offset() as i64)
        .fetch_all(pool)
        .await
        .map_err(AppError::internal)?;

    // Batch-load categories for all returned plugins
    let plugin_ids: Vec<Uuid> = rows.iter().map(|r| r.id).collect();
    let categories_map = load_categories_batch(pool, &plugin_ids).await?;

    let data = rows
        .into_iter()
        .map(|row| {
            let categories = categories_map.get(&row.id).cloned().unwrap_or_default();
            build_plugin_summary(row, categories)
        })
        .collect();

    Ok(Json(PaginatedResponse {
        data,
        pagination: PaginationMeta {
            page: params.page(),
            per_page,
            total,
            total_pages,
        },
    }))
}

/// POST /api/v1/plugins — create a new plugin (authenticated).
pub async fn create_plugin(
    State(state): State<AppState>,
    auth: AuthUser,
    Json(payload): Json<CreatePluginRequest>,
) -> Result<(StatusCode, Json<PluginResponse>), AppError> {
    payload.validate()?;

    let pool = &state.db;
    let name = payload.name.trim().to_string();
    let slug = generate_unique_slug(pool, &name).await?;
    let category_ids = payload.category_ids.unwrap_or_default();

    // Validate category IDs exist in the database
    validate_categories_exist(pool, &category_ids).await?;

    // Atomic insert: plugin + category associations
    let mut tx = pool.begin().await.map_err(AppError::internal)?;

    let plugin_id: Uuid = sqlx::query_scalar(
        "INSERT INTO plugins (author_id, name, slug, short_description, description,
                              repository_url, documentation_url, license)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id",
    )
    .bind(auth.user_id)
    .bind(&name)
    .bind(&slug)
    .bind(&payload.short_description)
    .bind(&payload.description)
    .bind(&payload.repository_url)
    .bind(&payload.documentation_url)
    .bind(&payload.license)
    .fetch_one(&mut *tx)
    .await
    .map_err(AppError::internal)?;

    if !category_ids.is_empty() {
        sqlx::query(
            "INSERT INTO plugin_categories (plugin_id, category_id)
             SELECT $1, unnest($2::uuid[])",
        )
        .bind(plugin_id)
        .bind(&category_ids)
        .execute(&mut *tx)
        .await
        .map_err(AppError::internal)?;
    }

    tx.commit().await.map_err(AppError::internal)?;

    // Load full response (plugin + author + categories)
    let row = fetch_plugin_by_slug(pool, &slug).await?;
    let categories = load_categories_for_plugin(pool, row.id).await?;
    let response = build_plugin_response(row, categories);

    Ok((StatusCode::CREATED, Json(response)))
}

/// GET /api/v1/plugins/:slug — single plugin detail.
pub async fn get_plugin(
    State(state): State<AppState>,
    Path(slug): Path<String>,
) -> Result<Json<PluginResponse>, AppError> {
    let pool = &state.db;
    let row = fetch_plugin_by_slug(pool, &slug).await?;
    let categories = load_categories_for_plugin(pool, row.id).await?;

    Ok(Json(build_plugin_response(row, categories)))
}

/// PUT /api/v1/plugins/:slug — update plugin metadata (owner or admin only).
pub async fn update_plugin(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(slug): Path<String>,
    Json(payload): Json<UpdatePluginRequest>,
) -> Result<Json<PluginResponse>, AppError> {
    payload.validate()?;

    let pool = &state.db;
    let row = fetch_plugin_by_slug(pool, &slug).await?;
    require_ownership(&auth, row.author_id)?;

    if !payload.has_changes() {
        let categories = load_categories_for_plugin(pool, row.id).await?;
        return Ok(Json(build_plugin_response(row, categories)));
    }

    // Validate new category IDs if provided
    if let Some(ref ids) = payload.category_ids {
        validate_categories_exist(pool, ids).await?;
    }

    let mut tx = pool.begin().await.map_err(AppError::internal)?;

    // Update scalar fields — COALESCE keeps existing values when input is NULL
    sqlx::query(
        "UPDATE plugins SET
            name              = COALESCE($1, name),
            short_description = COALESCE($2, short_description),
            description       = COALESCE($3, description),
            repository_url    = COALESCE($4, repository_url),
            documentation_url = COALESCE($5, documentation_url),
            license           = COALESCE($6, license),
            updated_at        = now()
         WHERE slug = $7 AND is_active = true",
    )
    .bind(&payload.name)
    .bind(&payload.short_description)
    .bind(&payload.description)
    .bind(&payload.repository_url)
    .bind(&payload.documentation_url)
    .bind(&payload.license)
    .bind(&slug)
    .execute(&mut *tx)
    .await
    .map_err(AppError::internal)?;

    // Replace category associations if provided
    if let Some(ref ids) = payload.category_ids {
        replace_plugin_categories(&mut tx, row.id, ids).await?;
    }

    tx.commit().await.map_err(AppError::internal)?;

    // Re-fetch for fresh response
    let updated_row = fetch_plugin_by_slug(pool, &slug).await?;
    let categories = load_categories_for_plugin(pool, updated_row.id).await?;

    Ok(Json(build_plugin_response(updated_row, categories)))
}

/// DELETE /api/v1/plugins/:slug — soft-delete (owner, admin or moderator).
pub async fn delete_plugin(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(slug): Path<String>,
) -> Result<Json<serde_json::Value>, AppError> {
    let pool = &state.db;
    let row = fetch_plugin_by_slug(pool, &slug).await?;

    // Owners, admins and moderators can soft-delete
    let is_allowed =
        auth.user_id == row.author_id || auth.role == "admin" || auth.role == "moderator";
    if !is_allowed {
        return Err(AppError::Forbidden);
    }

    sqlx::query("UPDATE plugins SET is_active = false, updated_at = now() WHERE slug = $1")
        .bind(&slug)
        .execute(pool)
        .await
        .map_err(AppError::internal)?;

    Ok(Json(serde_json::json!({ "message": "Plugin deleted" })))
}

// ── Version Row ─────────────────────────────────────────────────────────

#[derive(Debug, FromRow)]
struct VersionRow {
    id: Uuid,
    version: String,
    changelog: Option<String>,
    pumpkin_version_min: Option<String>,
    pumpkin_version_max: Option<String>,
    downloads: i64,
    is_yanked: bool,
    published_at: DateTime<Utc>,
}

/// GET /api/v1/plugins/:slug/versions — all versions for a plugin.
pub async fn list_versions(
    State(state): State<AppState>,
    Path(slug): Path<String>,
) -> Result<Json<VersionsListResponse>, AppError> {
    let pool = &state.db;

    // Verify the plugin exists and is active
    let plugin_id: Uuid = sqlx::query_scalar(
        "SELECT id FROM plugins WHERE slug = $1 AND is_active = true",
    )
    .bind(&slug)
    .fetch_optional(pool)
    .await
    .map_err(AppError::internal)?
    .ok_or(AppError::NotFound)?;

    let rows: Vec<VersionRow> = sqlx::query_as(
        "SELECT id, version, changelog, pumpkin_version_min, pumpkin_version_max,
                downloads, is_yanked, published_at
         FROM versions
         WHERE plugin_id = $1
         ORDER BY published_at DESC",
    )
    .bind(plugin_id)
    .fetch_all(pool)
    .await
    .map_err(AppError::internal)?;

    let versions: Vec<VersionResponse> = rows
        .into_iter()
        .map(|r| VersionResponse {
            id: r.id,
            version: r.version,
            changelog: r.changelog,
            pumpkin_version_min: r.pumpkin_version_min,
            pumpkin_version_max: r.pumpkin_version_max,
            downloads: r.downloads,
            is_yanked: r.is_yanked,
            published_at: r.published_at,
        })
        .collect();

    Ok(Json(VersionsListResponse {
        plugin_slug: slug,
        total: versions.len(),
        versions,
    }))
}

#[cfg(test)]
mod tests {
    use super::*;

    // ── slugify ─────────────────────────────────────────────────────────

    #[test]
    fn slugify_basic_name() {
        assert_eq!(slugify("My Plugin"), "my-plugin");
    }

    #[test]
    fn slugify_preserves_numbers() {
        assert_eq!(slugify("Plugin v2"), "plugin-v2");
    }

    #[test]
    fn slugify_collapses_consecutive_separators() {
        assert_eq!(slugify("hello   world"), "hello-world");
        assert_eq!(slugify("a--b--c"), "a-b-c");
    }

    #[test]
    fn slugify_strips_leading_trailing_separators() {
        assert_eq!(slugify("  hello  "), "hello");
        assert_eq!(slugify("--hello--"), "hello");
    }

    #[test]
    fn slugify_special_characters_become_hyphens() {
        assert_eq!(slugify("foo@bar!baz"), "foo-bar-baz");
        assert_eq!(slugify("hello.world#2"), "hello-world-2");
    }

    #[test]
    fn slugify_unicode_replaced_by_hyphens() {
        assert_eq!(slugify("café délice"), "caf-d-lice");
    }

    #[test]
    fn slugify_already_clean_input() {
        assert_eq!(slugify("clean-slug"), "clean-slug");
        assert_eq!(slugify("abc123"), "abc123");
    }

    #[test]
    fn slugify_empty_input() {
        assert_eq!(slugify(""), "");
    }

    #[test]
    fn slugify_all_special_chars() {
        assert_eq!(slugify("@#$%^&"), "");
    }

    // ── require_ownership ───────────────────────────────────────────────

    fn make_auth(user_id: Uuid, role: &str) -> AuthUser {
        AuthUser {
            user_id,
            username: "test".to_string(),
            role: role.to_string(),
        }
    }

    #[test]
    fn owner_is_allowed() {
        let user_id = Uuid::new_v4();
        let auth = make_auth(user_id, "author");
        assert!(require_ownership(&auth, user_id).is_ok());
    }

    #[test]
    fn admin_is_always_allowed() {
        let auth = make_auth(Uuid::new_v4(), "admin");
        let other_author_id = Uuid::new_v4();
        assert!(require_ownership(&auth, other_author_id).is_ok());
    }

    #[test]
    fn non_owner_non_admin_is_forbidden() {
        let auth = make_auth(Uuid::new_v4(), "author");
        let other_author_id = Uuid::new_v4();
        let result = require_ownership(&auth, other_author_id);
        assert!(result.is_err());
    }

    #[test]
    fn moderator_is_not_allowed_to_update() {
        let auth = make_auth(Uuid::new_v4(), "moderator");
        let other_author_id = Uuid::new_v4();
        // require_ownership only allows owner or admin, not moderator
        let result = require_ownership(&auth, other_author_id);
        assert!(result.is_err());
    }
}
