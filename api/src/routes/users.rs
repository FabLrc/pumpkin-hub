use axum::{
    extract::{Path, Query, State},
    routing::get,
    Json, Router,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

use crate::{error::AppError, state::AppState};

use super::plugins::dto::{
    AuthorSummary, CategorySummary, PaginatedResponse, PaginationMeta, PluginSummary,
};

// ── Constants ───────────────────────────────────────────────────────────────

const DEFAULT_PAGE: u32 = 1;
const DEFAULT_PER_PAGE: u32 = 20;
const MAX_PER_PAGE: u32 = 100;

// ── Routes ──────────────────────────────────────────────────────────────────

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/users/{username}", get(get_author_profile))
        .route("/users/{username}/plugins", get(get_author_plugins))
}

// ── DTOs ────────────────────────────────────────────────────────────────────

#[derive(Debug, Serialize)]
pub struct AuthorProfileResponse {
    pub id: Uuid,
    pub username: String,
    pub display_name: Option<String>,
    pub avatar_url: Option<String>,
    pub bio: Option<String>,
    pub role: String,
    pub plugin_count: i64,
    pub total_downloads: i64,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct AuthorPluginsParams {
    pub page: Option<u32>,
    pub per_page: Option<u32>,
}

impl AuthorPluginsParams {
    fn page(&self) -> u32 {
        self.page.unwrap_or(DEFAULT_PAGE).max(1)
    }

    fn per_page(&self) -> u32 {
        self.per_page
            .unwrap_or(DEFAULT_PER_PAGE)
            .clamp(1, MAX_PER_PAGE)
    }
}

// ── SQL Row Types ───────────────────────────────────────────────────────────

#[derive(Debug, FromRow)]
struct AuthorRow {
    id: Uuid,
    username: String,
    display_name: Option<String>,
    avatar_url: Option<String>,
    bio: Option<String>,
    role: String,
    created_at: DateTime<Utc>,
}

#[derive(Debug, FromRow)]
struct PluginWithAuthorRow {
    id: Uuid,
    author_id: Uuid,
    name: String,
    slug: String,
    short_description: Option<String>,
    icon_url: Option<String>,
    license: Option<String>,
    downloads_total: i64,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
    author_username: String,
    author_avatar_url: Option<String>,
}

#[derive(Debug, FromRow)]
struct PluginCategoryRow {
    plugin_id: Uuid,
    category_id: Uuid,
    category_name: String,
    category_slug: String,
}

// ── Handlers ────────────────────────────────────────────────────────────────

/// GET /api/v1/users/{username} — Public author profile with aggregate stats.
async fn get_author_profile(
    State(state): State<AppState>,
    Path(username): Path<String>,
) -> Result<Json<AuthorProfileResponse>, AppError> {
    let pool = &state.db;

    let author: AuthorRow = sqlx::query_as(
        "SELECT id, username, display_name, avatar_url, bio, role, created_at
         FROM users
         WHERE username = $1",
    )
    .bind(&username)
    .fetch_optional(pool)
    .await
    .map_err(AppError::internal)?
    .ok_or(AppError::NotFound)?;

    let stats: (i64, i64) = sqlx::query_as(
        "SELECT COUNT(*)::BIGINT, COALESCE(SUM(downloads_total), 0)::BIGINT
         FROM plugins
         WHERE author_id = $1 AND is_active = true",
    )
    .bind(author.id)
    .fetch_one(pool)
    .await
    .map_err(AppError::internal)?;

    Ok(Json(AuthorProfileResponse {
        id: author.id,
        username: author.username,
        display_name: author.display_name,
        avatar_url: author.avatar_url,
        bio: author.bio,
        role: author.role,
        plugin_count: stats.0,
        total_downloads: stats.1,
        created_at: author.created_at,
    }))
}

/// GET /api/v1/users/{username}/plugins — Paginated list of plugins by author.
async fn get_author_plugins(
    State(state): State<AppState>,
    Path(username): Path<String>,
    Query(params): Query<AuthorPluginsParams>,
) -> Result<Json<PaginatedResponse<PluginSummary>>, AppError> {
    let pool = &state.db;

    // Verify the user exists
    let author_id: Uuid = sqlx::query_scalar("SELECT id FROM users WHERE username = $1")
        .bind(&username)
        .fetch_optional(pool)
        .await
        .map_err(AppError::internal)?
        .ok_or(AppError::NotFound)?;

    let page = params.page();
    let per_page = params.per_page();
    let offset = ((page - 1) * per_page) as i64;

    let total: i64 = sqlx::query_scalar::<_, Option<i64>>(
        "SELECT COUNT(*) FROM plugins WHERE author_id = $1 AND is_active = true",
    )
    .bind(author_id)
    .fetch_one(pool)
    .await
    .map_err(AppError::internal)?
    .unwrap_or(0);

    let total_pages = if total == 0 {
        0
    } else {
        ((total as f64) / (per_page as f64)).ceil() as u32
    };

    let rows: Vec<PluginWithAuthorRow> = sqlx::query_as(
        "SELECT p.id, p.author_id, p.name, p.slug, p.short_description,
                p.icon_url, p.license, p.downloads_total, p.created_at, p.updated_at,
                u.username AS author_username, u.avatar_url AS author_avatar_url
         FROM plugins p
         JOIN users u ON p.author_id = u.id
         WHERE p.author_id = $1 AND p.is_active = true
         ORDER BY p.created_at DESC
         LIMIT $2 OFFSET $3",
    )
    .bind(author_id)
    .bind(per_page as i64)
    .bind(offset)
    .fetch_all(pool)
    .await
    .map_err(AppError::internal)?;

    // Batch-load categories and review stats
    let plugin_ids: Vec<Uuid> = rows.iter().map(|r| r.id).collect();
    let mut categories_map = load_categories_batch(pool, &plugin_ids).await?;
    let review_stats_map = load_review_stats_batch(pool, &plugin_ids).await?;

    let plugins: Vec<PluginSummary> = rows
        .into_iter()
        .map(|row| {
            let categories = categories_map.remove(&row.id).unwrap_or_default();
            let stats = review_stats_map.get(&row.id);
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
                icon_url: row.icon_url,
                license: row.license,
                downloads_total: row.downloads_total,
                categories,
                average_rating: stats.map(|s| s.0).unwrap_or(0.0),
                review_count: stats.map(|s| s.1).unwrap_or(0),
                created_at: row.created_at,
                updated_at: row.updated_at,
            }
        })
        .collect();

    Ok(Json(PaginatedResponse {
        data: plugins,
        pagination: PaginationMeta {
            page,
            per_page,
            total,
            total_pages,
        },
    }))
}

// ── Helpers ─────────────────────────────────────────────────────────────────

async fn load_categories_batch(
    pool: &sqlx::PgPool,
    plugin_ids: &[Uuid],
) -> Result<std::collections::HashMap<Uuid, Vec<CategorySummary>>, AppError> {
    if plugin_ids.is_empty() {
        return Ok(std::collections::HashMap::new());
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

    let mut map: std::collections::HashMap<Uuid, Vec<CategorySummary>> =
        std::collections::HashMap::new();
    for row in rows {
        map.entry(row.plugin_id).or_default().push(CategorySummary {
            id: row.category_id,
            name: row.category_name,
            slug: row.category_slug,
        });
    }

    Ok(map)
}

/// Batch-loads average rating and review count for a set of plugin IDs.
async fn load_review_stats_batch(
    pool: &sqlx::PgPool,
    plugin_ids: &[Uuid],
) -> Result<std::collections::HashMap<Uuid, (f64, i64)>, AppError> {
    if plugin_ids.is_empty() {
        return Ok(std::collections::HashMap::new());
    }

    #[derive(sqlx::FromRow)]
    struct Row {
        plugin_id: Uuid,
        review_count: Option<i64>,
        avg_rating: Option<f64>,
    }

    let rows: Vec<Row> = sqlx::query_as(
        "SELECT plugin_id, COUNT(*) AS review_count, AVG(rating::float) AS avg_rating
         FROM reviews
         WHERE plugin_id = ANY($1) AND is_hidden = FALSE
         GROUP BY plugin_id",
    )
    .bind(plugin_ids)
    .fetch_all(pool)
    .await
    .map_err(AppError::internal)?;

    let mut map = std::collections::HashMap::new();
    for row in rows {
        map.insert(
            row.plugin_id,
            (row.avg_rating.unwrap_or(0.0), row.review_count.unwrap_or(0)),
        );
    }
    Ok(map)
}
