use axum::{
    extract::{Path, State},
    http::{header, StatusCode},
    response::{IntoResponse, Response},
    Json,
};
use sqlx::PgPool;
use uuid::Uuid;

use crate::{
    auth::middleware::AuthUser, error::AppError, github::client::GitHubAppClient, state::AppState,
};

use super::dto::{GitHubLinkResponse, LinkGitHubRequest};

// ── Query Helpers ───────────────────────────────────────────────────────────

/// Fetches plugin id and author_id by slug. Returns NotFound if inactive or missing.
async fn fetch_plugin_id_and_author(pool: &PgPool, slug: &str) -> Result<(Uuid, Uuid), AppError> {
    let row: Option<(Uuid, Uuid)> =
        sqlx::query_as("SELECT id, author_id FROM plugins WHERE slug = $1 AND is_active = true")
            .bind(slug)
            .fetch_optional(pool)
            .await
            .map_err(AppError::internal)?;

    row.ok_or(AppError::NotFound)
}

fn require_ownership(auth: &AuthUser, author_id: Uuid) -> Result<(), AppError> {
    if auth.user_id == author_id || auth.role == "admin" {
        return Ok(());
    }
    Err(AppError::Forbidden)
}

fn build_link_response(row: GitHubInstallationRow) -> GitHubLinkResponse {
    GitHubLinkResponse {
        id: row.id,
        plugin_id: row.plugin_id,
        installation_id: row.installation_id,
        repository_full_name: format!("{}/{}", row.repository_owner, row.repository_name),
        repository_owner: row.repository_owner,
        repository_name: row.repository_name,
        default_branch: row.default_branch,
        sync_readme: row.sync_readme,
        sync_changelog: row.sync_changelog,
        auto_publish: row.auto_publish,
        last_webhook_at: row.last_webhook_at,
        created_at: row.created_at,
    }
}

#[derive(sqlx::FromRow)]
struct GitHubInstallationRow {
    id: Uuid,
    plugin_id: Uuid,
    installation_id: i64,
    repository_owner: String,
    repository_name: String,
    default_branch: String,
    sync_readme: bool,
    sync_changelog: bool,
    auto_publish: bool,
    last_webhook_at: Option<chrono::DateTime<chrono::Utc>>,
    created_at: chrono::DateTime<chrono::Utc>,
}

// ── Handlers ────────────────────────────────────────────────────────────────

/// POST /api/v1/plugins/{slug}/github/link — Link a GitHub repository to a plugin.
pub async fn link_github(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(slug): Path<String>,
    Json(payload): Json<LinkGitHubRequest>,
) -> Result<(StatusCode, Json<GitHubLinkResponse>), AppError> {
    payload.validate()?;

    let pool = &state.db;
    let (plugin_id, author_id) = fetch_plugin_id_and_author(pool, &slug).await?;
    require_ownership(&auth, author_id)?;

    // Verify that the GitHub App config is available
    let github_app_config = state.config.github_app.as_ref().ok_or_else(|| {
        AppError::internal(std::io::Error::new(
            std::io::ErrorKind::Other,
            "GitHub App is not configured on this server",
        ))
    })?;

    // Verify that the installation has access to the repository
    let client = GitHubAppClient::new(github_app_config);
    let repo = client
        .get_repository(
            payload.installation_id,
            &payload.repository_owner,
            &payload.repository_name,
        )
        .await
        .map_err(|e| {
            AppError::UnprocessableEntity(format!(
                "Cannot access repository {}/{}: {e}",
                payload.repository_owner, payload.repository_name
            ))
        })?;

    // Check that the repo is not already linked to another plugin
    let existing: Option<Uuid> = sqlx::query_scalar(
        "SELECT plugin_id FROM github_installations
         WHERE repository_owner = $1 AND repository_name = $2",
    )
    .bind(&payload.repository_owner)
    .bind(&payload.repository_name)
    .fetch_optional(pool)
    .await
    .map_err(AppError::internal)?;

    if let Some(existing_plugin_id) = existing {
        if existing_plugin_id != plugin_id {
            return Err(AppError::Conflict(
                "This repository is already linked to another plugin".to_string(),
            ));
        }
    }

    // Upsert the GitHub installation link
    let row: GitHubInstallationRow = sqlx::query_as(
        "INSERT INTO github_installations
            (plugin_id, user_id, installation_id, repository_owner, repository_name,
             default_branch, sync_readme, sync_changelog, auto_publish)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (plugin_id) DO UPDATE SET
            installation_id = EXCLUDED.installation_id,
            repository_owner = EXCLUDED.repository_owner,
            repository_name = EXCLUDED.repository_name,
            default_branch = EXCLUDED.default_branch,
            sync_readme = EXCLUDED.sync_readme,
            sync_changelog = EXCLUDED.sync_changelog,
            auto_publish = EXCLUDED.auto_publish,
            updated_at = NOW()
         RETURNING id, plugin_id, installation_id, repository_owner, repository_name,
                   default_branch, sync_readme, sync_changelog, auto_publish,
                   last_webhook_at, created_at",
    )
    .bind(plugin_id)
    .bind(auth.user_id)
    .bind(payload.installation_id)
    .bind(&payload.repository_owner)
    .bind(&payload.repository_name)
    .bind(&repo.default_branch)
    .bind(payload.sync_readme.unwrap_or(true))
    .bind(payload.sync_changelog.unwrap_or(true))
    .bind(payload.auto_publish.unwrap_or(true))
    .fetch_one(pool)
    .await
    .map_err(AppError::internal)?;

    tracing::info!(
        plugin_slug = %slug,
        repo = %format!("{}/{}", payload.repository_owner, payload.repository_name),
        "GitHub repository linked to plugin"
    );

    Ok((StatusCode::CREATED, Json(build_link_response(row))))
}

/// GET /api/v1/plugins/{slug}/github — Get the GitHub link status for a plugin.
pub async fn get_github_link(
    State(state): State<AppState>,
    Path(slug): Path<String>,
) -> Result<Json<GitHubLinkResponse>, AppError> {
    let pool = &state.db;
    let (plugin_id, _) = fetch_plugin_id_and_author(pool, &slug).await?;

    let row: GitHubInstallationRow = sqlx::query_as(
        "SELECT id, plugin_id, installation_id, repository_owner, repository_name,
                default_branch, sync_readme, sync_changelog, auto_publish,
                last_webhook_at, created_at
         FROM github_installations
         WHERE plugin_id = $1",
    )
    .bind(plugin_id)
    .fetch_optional(pool)
    .await
    .map_err(AppError::internal)?
    .ok_or(AppError::NotFound)?;

    Ok(Json(build_link_response(row)))
}

/// DELETE /api/v1/plugins/{slug}/github — Unlink a GitHub repository from a plugin.
pub async fn unlink_github(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(slug): Path<String>,
) -> Result<StatusCode, AppError> {
    let pool = &state.db;
    let (plugin_id, author_id) = fetch_plugin_id_and_author(pool, &slug).await?;
    require_ownership(&auth, author_id)?;

    let result = sqlx::query("DELETE FROM github_installations WHERE plugin_id = $1")
        .bind(plugin_id)
        .execute(pool)
        .await
        .map_err(AppError::internal)?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound);
    }

    tracing::info!(plugin_slug = %slug, "GitHub repository unlinked from plugin");

    Ok(StatusCode::NO_CONTENT)
}

/// GET /api/v1/plugins/{slug}/badge.svg — Dynamic SVG badge showing the latest version.
pub async fn plugin_badge(
    State(state): State<AppState>,
    Path(slug): Path<String>,
) -> Result<Response, AppError> {
    let pool = &state.db;

    // Verify plugin exists
    let plugin_exists: Option<Uuid> =
        sqlx::query_scalar("SELECT id FROM plugins WHERE slug = $1 AND is_active = true")
            .bind(&slug)
            .fetch_optional(pool)
            .await
            .map_err(AppError::internal)?;

    let plugin_id = plugin_exists.ok_or(AppError::NotFound)?;

    // Fetch the latest non-yanked version
    let latest_version: Option<String> = sqlx::query_scalar(
        "SELECT version FROM versions
         WHERE plugin_id = $1 AND is_yanked = false
         ORDER BY created_at DESC
         LIMIT 1",
    )
    .bind(plugin_id)
    .fetch_optional(pool)
    .await
    .map_err(AppError::internal)?;

    let version_text = latest_version
        .as_deref()
        .map(|v| format!("v{v}"))
        .unwrap_or_else(|| "no release".to_string());

    let label = "Download on Pumpkin Hub";
    let api_url = &state.config.server.api_public_url;
    let link_url = format!("{api_url}/plugins/{slug}");

    let svg = render_badge_svg(label, &version_text, &link_url);

    Ok((
        StatusCode::OK,
        [
            (header::CONTENT_TYPE, "image/svg+xml"),
            (header::CACHE_CONTROL, "public, max-age=300, s-maxage=300"),
        ],
        svg,
    )
        .into_response())
}

// ── SVG Badge Rendering ─────────────────────────────────────────────────────

/// Renders a shields.io-style SVG badge with a label and value.
fn render_badge_svg(label: &str, value: &str, link_url: &str) -> String {
    // Approximate character widths for the monospace-ish font
    let label_width = estimate_text_width(label);
    let value_width = estimate_text_width(value);
    let padding = 16;
    let separator = 1;

    let left_width = label_width + padding;
    let right_width = value_width + padding;
    let total_width = left_width + separator + right_width;
    let height = 28;

    let left_text_x = left_width / 2;
    let right_text_x = left_width + separator + right_width / 2;
    let text_y = height / 2 + 1;

    // Escape XML special chars in dynamic content
    let label_escaped = xml_escape(label);
    let value_escaped = xml_escape(value);
    let link_escaped = xml_escape(link_url);

    format!(
        r##"<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="{total_width}" height="{height}">
  <a xlink:href="{link_escaped}" target="_blank">
    <rect width="{left_width}" height="{height}" fill="#1a1a1a"/>
    <rect x="{left_x}" width="{right_w}" height="{height}" fill="#f97316"/>
    <text x="{left_text_x}" y="{text_y}" fill="#e5e5e5" font-family="Consolas,'DejaVu Sans Mono',monospace" font-size="11" text-anchor="middle" dominant-baseline="central">{label_escaped}</text>
    <text x="{right_text_x}" y="{text_y}" fill="#fff" font-family="Consolas,'DejaVu Sans Mono',monospace" font-size="11" font-weight="bold" text-anchor="middle" dominant-baseline="central">{value_escaped}</text>
  </a>
</svg>"##,
        left_x = left_width + separator,
        right_w = right_width,
    )
}

/// Estimates the pixel width of a text string for the badge SVG.
fn estimate_text_width(text: &str) -> i32 {
    // ~6.8px per character for 11px monospace font
    (text.len() as f64 * 6.8).ceil() as i32
}

/// Escapes XML special characters in a string.
fn xml_escape(input: &str) -> String {
    input
        .replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&apos;")
}
