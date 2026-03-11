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

use super::dto::{
    GitHubLinkResponse, GitHubRepositoryDto, InstallationRepositoriesResponse, LinkGitHubRequest,
    MyGithubRepositoryDto, MyRepositoriesResponse, PublishFromGithubRequest,
    PublishFromGithubResponse,
};

use crate::routes::plugins::handlers::{generate_unique_slug, validate_categories_exist};

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
        AppError::internal(std::io::Error::other(
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

/// GET /api/v1/github/installations/{installation_id}/repositories
/// Lists all repositories accessible to the given GitHub App installation.
/// Requires authentication — the user must be logged in to use this endpoint.
pub async fn list_installation_repos(
    State(state): State<AppState>,
    _auth: AuthUser,
    Path(installation_id): Path<i64>,
) -> Result<Json<InstallationRepositoriesResponse>, AppError> {
    let github_app_config = state.config.github_app.as_ref().ok_or_else(|| {
        AppError::internal(std::io::Error::other(
            "GitHub App is not configured on this server",
        ))
    })?;

    let client = GitHubAppClient::new(github_app_config);
    let repos = client
        .list_installation_repositories(installation_id)
        .await
        .map_err(|e| {
            AppError::UnprocessableEntity(format!(
                "Cannot list repositories for installation {installation_id}: {e}"
            ))
        })?;

    let repositories = repos
        .into_iter()
        .map(|r| {
            let (owner, name) = r
                .full_name
                .split_once('/')
                .map(|(o, n)| (o.to_string(), n.to_string()))
                .unwrap_or_else(|| (r.full_name.clone(), r.name.clone()));
            GitHubRepositoryDto {
                full_name: r.full_name,
                owner,
                name,
                default_branch: r.default_branch,
                description: r.description,
            }
        })
        .collect();

    Ok(Json(InstallationRepositoriesResponse {
        installation_id,
        repositories,
    }))
}

/// GET /api/v1/github/my-repositories
/// Lists all repositories the authenticated user can access through the Pumpkin Hub GitHub App.
///
/// Finds the user's GitHub numeric ID in `auth_providers`, lists all App installations,
/// filters those belonging to the user, and fetches repositories for each.
pub async fn list_my_repositories(
    State(state): State<AppState>,
    auth: AuthUser,
) -> Result<Json<MyRepositoriesResponse>, AppError> {
    let pool = &state.db;

    // Resolve the user's GitHub numeric ID from auth_providers
    let github_provider_id: Option<String> = sqlx::query_scalar(
        "SELECT provider_id FROM auth_providers WHERE user_id = $1 AND provider = 'github'",
    )
    .bind(auth.user_id)
    .fetch_optional(pool)
    .await
    .map_err(AppError::internal)?;

    let github_user_id: i64 = match github_provider_id {
        Some(id) => id.parse().map_err(|_| {
            AppError::internal(std::io::Error::other(
                "Corrupted GitHub provider_id in auth_providers",
            ))
        })?,
        None => {
            return Err(AppError::UnprocessableEntity(
                "Your account is not linked to GitHub. Please sign in with GitHub first."
                    .to_string(),
            ));
        }
    };

    let github_app_config = state.config.github_app.as_ref().ok_or_else(|| {
        AppError::internal(std::io::Error::other(
            "GitHub App is not configured on this server",
        ))
    })?;

    let client = GitHubAppClient::new(github_app_config);

    // List all installations of the Pumpkin Hub App and keep only those owned by the user
    let installations = client.list_app_installations().await.map_err(|e| {
        AppError::internal(std::io::Error::other(format!(
            "Failed to list GitHub App installations: {e}"
        )))
    })?;

    let user_installations: Vec<_> = installations
        .into_iter()
        .filter(|inst| inst.account.id == github_user_id)
        .collect();

    // For each matching installation, fetch its repositories
    let mut all_repos: Vec<MyGithubRepositoryDto> = Vec::new();

    for installation in &user_installations {
        match client.list_installation_repositories(installation.id).await {
            Ok(repos) => {
                for r in repos {
                    let (owner, name) = r
                        .full_name
                        .split_once('/')
                        .map(|(o, n)| (o.to_string(), n.to_string()))
                        .unwrap_or_else(|| (r.full_name.clone(), r.name.clone()));
                    all_repos.push(MyGithubRepositoryDto {
                        installation_id: installation.id,
                        full_name: r.full_name,
                        owner,
                        name,
                        default_branch: r.default_branch,
                        description: r.description,
                    });
                }
            }
            Err(e) => {
                tracing::warn!(
                    installation_id = installation.id,
                    "Failed to list repos for installation: {e}"
                );
            }
        }
    }

    Ok(Json(MyRepositoriesResponse {
        repositories: all_repos,
    }))
}

/// POST /api/v1/plugins/from-github
/// Creates a new plugin pre-populated with metadata fetched from a GitHub repository,
/// then links the GitHub installation in a single operation.
///
/// - Plugin name defaults to the repository name.
/// - Short description defaults to the GitHub repository description.
/// - Description is pre-filled with the README.md content (if present).
/// - Repository URL is set to `https://github.com/{owner}/{repo}`.
pub async fn publish_plugin_from_github(
    State(state): State<AppState>,
    auth: AuthUser,
    Json(payload): Json<PublishFromGithubRequest>,
) -> Result<(StatusCode, Json<PublishFromGithubResponse>), AppError> {
    payload.validate()?;
    auth.require_permission("publish")?;

    let github_app_config = state.config.github_app.as_ref().ok_or_else(|| {
        AppError::internal(std::io::Error::other(
            "GitHub App is not configured on this server",
        ))
    })?;

    let client = GitHubAppClient::new(github_app_config);

    // Verify access and fetch repository metadata
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

    // Check the repository is not already linked to another plugin
    let pool = &state.db;
    let existing_link: Option<Uuid> = sqlx::query_scalar(
        "SELECT plugin_id FROM github_installations
         WHERE repository_owner = $1 AND repository_name = $2",
    )
    .bind(&payload.repository_owner)
    .bind(&payload.repository_name)
    .fetch_optional(pool)
    .await
    .map_err(AppError::internal)?;

    if existing_link.is_some() {
        return Err(AppError::Conflict(
            "This repository is already linked to a plugin on Pumpkin Hub".to_string(),
        ));
    }

    // Resolve plugin name and short description
    let plugin_name = payload
        .plugin_name
        .as_deref()
        .filter(|s| !s.is_empty())
        .unwrap_or(&repo.name)
        .to_string();

    let short_description = payload
        .short_description
        .clone()
        .or_else(|| repo.description.clone());

    // Fetch README for the long description (best-effort)
    let readme_content = client
        .get_file_content(
            payload.installation_id,
            &payload.repository_owner,
            &payload.repository_name,
            "README.md",
        )
        .await
        .unwrap_or(None);

    let repository_url = format!(
        "https://github.com/{}/{}",
        payload.repository_owner, payload.repository_name
    );

    // Generate a unique slug from the plugin name
    let slug = generate_unique_slug(pool, &plugin_name).await?;

    let category_ids = payload.category_ids.clone().unwrap_or_default();
    validate_categories_exist(pool, &category_ids).await?;

    // Atomic create: plugin + categories + github link
    let mut tx = pool.begin().await.map_err(AppError::internal)?;

    let plugin_id: Uuid = sqlx::query_scalar(
        "INSERT INTO plugins (author_id, name, slug, short_description, description, repository_url)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id",
    )
    .bind(auth.user_id)
    .bind(&plugin_name)
    .bind(&slug)
    .bind(&short_description)
    .bind(&readme_content)
    .bind(&repository_url)
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

    let github_row: GitHubInstallationRow = sqlx::query_as(
        "INSERT INTO github_installations
            (plugin_id, user_id, installation_id, repository_owner, repository_name,
             default_branch, sync_readme, sync_changelog, auto_publish)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
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
    .fetch_one(&mut *tx)
    .await
    .map_err(AppError::internal)?;

    tx.commit().await.map_err(AppError::internal)?;

    tracing::info!(
        plugin_slug = %slug,
        repo = %format!("{}/{}", payload.repository_owner, payload.repository_name),
        "Plugin published from GitHub repository"
    );

    // Fire-and-forget Meilisearch indexing
    let search = state.search.clone();
    let db = pool.clone();
    tokio::spawn(async move {
        if let Ok(Some(doc)) =
            crate::search::indexer::build_single_plugin_document(&db, plugin_id).await
        {
            if let Err(e) = search.index_plugin(&doc).await {
                tracing::warn!("Failed to index new plugin from GitHub in Meilisearch: {e}");
            }
        }
    });

    Ok((
        StatusCode::CREATED,
        Json(PublishFromGithubResponse {
            plugin_slug: slug,
            github_link: build_link_response(github_row),
        }),
    ))
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
