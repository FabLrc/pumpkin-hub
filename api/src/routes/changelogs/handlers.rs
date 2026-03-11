use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use sqlx::FromRow;
use uuid::Uuid;

use crate::routes::plugins::handlers::require_ownership;
use crate::{auth::middleware::AuthUser, error::AppError, state::AppState};

use super::dto::{ChangelogResponse, UpdateChangelogRequest};

// ── SQL Row Type ────────────────────────────────────────────────────────────

#[derive(Debug, FromRow)]
struct ChangelogRow {
    #[allow(dead_code)]
    id: Uuid,
    content: String,
    source: String,
    updated_at: chrono::DateTime<chrono::Utc>,
}

/// Fetches plugin_id and author_id by slug.
async fn fetch_plugin_info(pool: &sqlx::PgPool, slug: &str) -> Result<(Uuid, Uuid), AppError> {
    #[derive(FromRow)]
    struct PluginInfo {
        id: Uuid,
        author_id: Uuid,
    }

    let info: PluginInfo =
        sqlx::query_as("SELECT id, author_id FROM plugins WHERE slug = $1 AND is_active = true")
            .bind(slug)
            .fetch_optional(pool)
            .await
            .map_err(AppError::internal)?
            .ok_or(AppError::NotFound)?;

    Ok((info.id, info.author_id))
}

// ── Handlers ────────────────────────────────────────────────────────────────

/// GET /api/v1/plugins/{slug}/changelog
/// Returns the changelog for a plugin (public).
pub async fn get_changelog(
    State(state): State<AppState>,
    Path(slug): Path<String>,
) -> Result<Json<ChangelogResponse>, AppError> {
    let pool = &state.db;
    let (plugin_id, _) = fetch_plugin_info(pool, &slug).await?;

    let row: Option<ChangelogRow> = sqlx::query_as(
        "SELECT id, content, source, updated_at
         FROM plugin_changelogs
         WHERE plugin_id = $1",
    )
    .bind(plugin_id)
    .fetch_optional(pool)
    .await
    .map_err(AppError::internal)?;

    match row {
        Some(r) => Ok(Json(ChangelogResponse {
            plugin_slug: slug,
            content: r.content,
            source: r.source,
            updated_at: r.updated_at,
        })),
        None => Ok(Json(ChangelogResponse {
            plugin_slug: slug,
            content: String::new(),
            source: "manual".to_string(),
            updated_at: chrono::Utc::now(),
        })),
    }
}

/// PUT /api/v1/plugins/{slug}/changelog
/// Create or update the changelog (manual source). Requires plugin ownership.
pub async fn update_changelog(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(slug): Path<String>,
    Json(body): Json<UpdateChangelogRequest>,
) -> Result<Json<ChangelogResponse>, AppError> {
    body.validate()?;
    let pool = &state.db;
    let (plugin_id, author_id) = fetch_plugin_info(pool, &slug).await?;
    require_ownership(&auth, author_id)?;

    let row: ChangelogRow = sqlx::query_as(
        "INSERT INTO plugin_changelogs (plugin_id, content, source, updated_by)
         VALUES ($1, $2, 'manual', $3)
         ON CONFLICT (plugin_id) DO UPDATE
         SET content = EXCLUDED.content,
             source = 'manual',
             updated_by = EXCLUDED.updated_by,
             updated_at = now()
         RETURNING id, content, source, updated_at",
    )
    .bind(plugin_id)
    .bind(&body.content)
    .bind(auth.user_id)
    .fetch_one(pool)
    .await
    .map_err(AppError::internal)?;

    Ok(Json(ChangelogResponse {
        plugin_slug: slug,
        content: row.content,
        source: row.source,
        updated_at: row.updated_at,
    }))
}

/// DELETE /api/v1/plugins/{slug}/changelog
/// Remove the changelog entry. Requires plugin ownership.
pub async fn delete_changelog(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(slug): Path<String>,
) -> Result<StatusCode, AppError> {
    let pool = &state.db;
    let (plugin_id, author_id) = fetch_plugin_info(pool, &slug).await?;
    require_ownership(&auth, author_id)?;

    sqlx::query("DELETE FROM plugin_changelogs WHERE plugin_id = $1")
        .bind(plugin_id)
        .execute(pool)
        .await
        .map_err(AppError::internal)?;

    Ok(StatusCode::NO_CONTENT)
}
