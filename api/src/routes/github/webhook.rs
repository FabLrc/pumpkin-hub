use axum::{
    body::Bytes,
    extract::State,
    http::{HeaderMap, StatusCode},
};
use serde::Deserialize;
use sha2::{Digest, Sha256};
use sqlx::PgPool;
use uuid::Uuid;

use crate::{
    error::AppError,
    github::client::{verify_webhook_signature, GitHubAppClient},
    state::AppState,
    storage::ObjectStorage,
};

// ── GitHub Webhook Payload Types ────────────────────────────────────────────

#[derive(Debug, Deserialize)]
struct WebhookPayload {
    action: Option<String>,
    release: Option<ReleasePayload>,
    #[serde(rename = "ref")]
    git_ref: Option<String>,
    repository: Option<RepositoryPayload>,
    #[allow(dead_code)]
    installation: Option<InstallationRef>,
}

#[derive(Debug, Deserialize)]
struct ReleasePayload {
    tag_name: String,
    body: Option<String>,
    html_url: String,
    assets: Vec<ReleaseAssetPayload>,
}

#[derive(Debug, Deserialize)]
struct ReleaseAssetPayload {
    name: String,
    #[allow(dead_code)]
    size: i64,
    content_type: String,
    browser_download_url: String,
}

#[derive(Debug, Deserialize)]
struct RepositoryPayload {
    full_name: String,
}

#[derive(Debug, Deserialize)]
#[allow(dead_code)]
struct InstallationRef {
    id: i64,
}

// ── Webhook Row Types ───────────────────────────────────────────────────────

#[derive(sqlx::FromRow)]
struct LinkedPlugin {
    plugin_id: Uuid,
    plugin_slug: String,
    installation_id: i64,
    repository_owner: String,
    repository_name: String,
    default_branch: String,
    sync_readme: bool,
    sync_changelog: bool,
    auto_publish: bool,
}

// ── Main Webhook Handler ────────────────────────────────────────────────────

/// POST /api/v1/webhooks/github — Receives and processes GitHub App webhook events.
///
/// Verifies the HMAC-SHA256 signature before processing.
/// Handles two event types:
/// - `release` (action=published): auto-creates a new version + downloads assets
/// - `push` (on default branch): syncs README and CHANGELOG
pub async fn handle_github_webhook(
    State(state): State<AppState>,
    headers: HeaderMap,
    body: Bytes,
) -> Result<StatusCode, AppError> {
    let github_app_config = state.config.github_app.as_ref().ok_or(AppError::NotFound)?;

    // Verify webhook signature
    let signature = headers
        .get("x-hub-signature-256")
        .and_then(|v| v.to_str().ok())
        .ok_or(AppError::Unauthorized)?;

    if !verify_webhook_signature(&github_app_config.webhook_secret, &body, signature) {
        tracing::warn!("Invalid GitHub webhook signature");
        return Err(AppError::Unauthorized);
    }

    let event_type = headers
        .get("x-github-event")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("unknown");

    let payload: WebhookPayload = serde_json::from_slice(&body).map_err(|e| {
        tracing::warn!("Failed to parse webhook payload: {e}");
        AppError::UnprocessableEntity("Invalid webhook payload".to_string())
    })?;

    let repo_full_name = payload
        .repository
        .as_ref()
        .map(|r| r.full_name.as_str())
        .unwrap_or("unknown");

    tracing::info!(
        event = event_type,
        repo = repo_full_name,
        "Received GitHub webhook"
    );

    // Look up linked plugin for this repository
    let (owner, name) = parse_full_name(repo_full_name)
        .ok_or_else(|| AppError::UnprocessableEntity("Invalid repository name".to_string()))?;

    let linked: Option<LinkedPlugin> = sqlx::query_as(
        "SELECT gi.plugin_id, p.slug AS plugin_slug,
                gi.installation_id, gi.repository_owner, gi.repository_name,
                gi.default_branch, gi.sync_readme, gi.sync_changelog, gi.auto_publish
         FROM github_installations gi
         JOIN plugins p ON gi.plugin_id = p.id
         WHERE gi.repository_owner = $1 AND gi.repository_name = $2
           AND p.is_active = true",
    )
    .bind(owner)
    .bind(name)
    .fetch_optional(&state.db)
    .await
    .map_err(AppError::internal)?;

    let linked = match linked {
        Some(l) => l,
        None => {
            tracing::debug!(repo = repo_full_name, "No linked plugin found — ignoring");
            return Ok(StatusCode::OK);
        }
    };

    // Update last_webhook_at timestamp
    sqlx::query("UPDATE github_installations SET last_webhook_at = NOW() WHERE plugin_id = $1")
        .bind(linked.plugin_id)
        .execute(&state.db)
        .await
        .map_err(AppError::internal)?;

    match event_type {
        "release" => {
            if let Some(ref release) = payload.release {
                if payload.action.as_deref() == Some("published") && linked.auto_publish {
                    handle_release_published(&state, &linked, release).await?;
                }
            }
        }
        "push" => {
            if is_default_branch_push(&payload, &linked.default_branch) {
                handle_push_sync(&state, &linked).await?;
            }
        }
        _ => {
            tracing::debug!(event = event_type, "Ignoring unhandled webhook event");
        }
    }

    Ok(StatusCode::OK)
}

// ── Release Handler ─────────────────────────────────────────────────────────

/// Handles a `release.published` event: creates a new version and downloads assets.
async fn handle_release_published(
    state: &AppState,
    linked: &LinkedPlugin,
    release: &ReleasePayload,
) -> Result<(), AppError> {
    let pool = &state.db;
    let version_str = normalize_version_tag(&release.tag_name);

    // Validate semver
    if semver::Version::parse(&version_str).is_err() {
        tracing::warn!(
            tag = %release.tag_name,
            plugin = %linked.plugin_slug,
            "Tag is not valid semver — skipping auto-publish"
        );
        // Send notification to the author about invalid tag
        notify_invalid_tag(pool, linked, &release.tag_name).await;
        return Ok(());
    }

    // Check for duplicate version
    let existing: Option<Uuid> =
        sqlx::query_scalar("SELECT id FROM versions WHERE plugin_id = $1 AND version = $2")
            .bind(linked.plugin_id)
            .bind(&version_str)
            .fetch_optional(pool)
            .await
            .map_err(AppError::internal)?;

    if existing.is_some() {
        tracing::info!(
            version = %version_str,
            plugin = %linked.plugin_slug,
            "Version already exists — skipping"
        );
        return Ok(());
    }

    // Build changelog from release body with link to GitHub release
    let changelog = release.body.as_deref().map(|body| {
        format!(
            "{body}\n\n---\n*Published automatically from [GitHub Release]({})*",
            release.html_url
        )
    });

    // Create the version
    let version_id: Uuid = sqlx::query_scalar(
        "INSERT INTO versions (plugin_id, version, changelog)
         VALUES ($1, $2, $3)
         RETURNING id",
    )
    .bind(linked.plugin_id)
    .bind(&version_str)
    .bind(&changelog)
    .fetch_one(pool)
    .await
    .map_err(AppError::internal)?;

    tracing::info!(
        version = %version_str,
        plugin = %linked.plugin_slug,
        "Auto-published version from GitHub release"
    );

    // Download and store release assets as binaries
    let github_client = state
        .config
        .github_app
        .as_ref()
        .map(GitHubAppClient::new);

    if let Some(client) = github_client {
        for asset in &release.assets {
            if let Some(platform) = detect_platform_from_filename(&asset.name) {
                match download_and_store_asset(
                    state,
                    &client,
                    linked,
                    version_id,
                    &version_str,
                    &platform,
                    asset,
                )
                .await
                {
                    Ok(_) => {
                        tracing::info!(
                            asset = %asset.name,
                            platform = %platform,
                            "Stored release asset"
                        );
                    }
                    Err(e) => {
                        tracing::warn!(
                            asset = %asset.name,
                            error = %e,
                            "Failed to store release asset"
                        );
                    }
                }
            }
        }
    }

    // Re-index in Meilisearch
    reindex_plugin(state, linked.plugin_id).await;

    // Send notification to the author
    notify_version_published(pool, linked, &version_str).await;

    Ok(())
}

/// Downloads a release asset from GitHub and stores it in S3.
async fn download_and_store_asset(
    state: &AppState,
    client: &GitHubAppClient,
    linked: &LinkedPlugin,
    version_id: Uuid,
    version_str: &str,
    platform: &str,
    asset: &ReleaseAssetPayload,
) -> Result<(), AppError> {
    let pool = &state.db;

    // Check for existing binary with same platform
    let existing: Option<Uuid> =
        sqlx::query_scalar("SELECT id FROM binaries WHERE version_id = $1 AND platform = $2")
            .bind(version_id)
            .bind(platform)
            .fetch_optional(pool)
            .await
            .map_err(AppError::internal)?;

    if existing.is_some() {
        return Ok(()); // Already exists
    }

    // Download the asset
    let data = client
        .download_asset(&asset.browser_download_url)
        .await
        .map_err(|e| AppError::internal(std::io::Error::other(e.to_string())))?;

    // Compute SHA-256 checksum
    let checksum = compute_sha256(&data);

    // Build storage key and upload
    let storage_key =
        ObjectStorage::build_storage_key(&linked.plugin_slug, version_str, platform, &asset.name);
    let file_size = data.len() as i64;
    let content_type = &asset.content_type;

    state
        .storage
        .put_object(&storage_key, data, content_type)
        .await
        .map_err(|e| AppError::internal(std::io::Error::other(e.to_string())))?;

    // Insert binary metadata
    sqlx::query(
        "INSERT INTO binaries (version_id, platform, file_name, file_size, checksum_sha256, storage_key, content_type)
         VALUES ($1, $2, $3, $4, $5, $6, $7)",
    )
    .bind(version_id)
    .bind(platform)
    .bind(&asset.name)
    .bind(file_size)
    .bind(&checksum)
    .bind(&storage_key)
    .bind(content_type)
    .execute(pool)
    .await
    .map_err(AppError::internal)?;

    Ok(())
}

// ── Push Sync Handler ───────────────────────────────────────────────────────

/// Handles a `push` event on the default branch: syncs README and CHANGELOG.
async fn handle_push_sync(state: &AppState, linked: &LinkedPlugin) -> Result<(), AppError> {
    let github_app_config = match state.config.github_app.as_ref() {
        Some(cfg) => cfg,
        None => return Ok(()),
    };

    let client = GitHubAppClient::new(github_app_config);

    if linked.sync_readme {
        match client
            .get_file_content(
                linked.installation_id,
                &linked.repository_owner,
                &linked.repository_name,
                "README.md",
            )
            .await
        {
            Ok(Some(readme_content)) => {
                sqlx::query(
                    "UPDATE plugins SET description = $1, updated_at = NOW() WHERE id = $2",
                )
                .bind(&readme_content)
                .bind(linked.plugin_id)
                .execute(&state.db)
                .await
                .map_err(AppError::internal)?;

                tracing::info!(
                    plugin = %linked.plugin_slug,
                    "Synced README.md from GitHub"
                );
            }
            Ok(None) => {
                tracing::debug!(plugin = %linked.plugin_slug, "No README.md found in repo");
            }
            Err(e) => {
                tracing::warn!(
                    plugin = %linked.plugin_slug,
                    error = %e,
                    "Failed to fetch README.md"
                );
            }
        }
    }

    if linked.sync_changelog {
        match client
            .get_file_content(
                linked.installation_id,
                &linked.repository_owner,
                &linked.repository_name,
                "CHANGELOG.md",
            )
            .await
        {
            Ok(Some(changelog_content)) => {
                // Update the latest version's changelog
                sqlx::query(
                    "UPDATE versions SET changelog = $1
                     WHERE id = (
                         SELECT id FROM versions
                         WHERE plugin_id = $2 AND is_yanked = false
                         ORDER BY created_at DESC LIMIT 1
                     )",
                )
                .bind(&changelog_content)
                .bind(linked.plugin_id)
                .execute(&state.db)
                .await
                .map_err(AppError::internal)?;

                tracing::info!(
                    plugin = %linked.plugin_slug,
                    "Synced CHANGELOG.md from GitHub"
                );
            }
            Ok(None) => {
                tracing::debug!(plugin = %linked.plugin_slug, "No CHANGELOG.md found");
            }
            Err(e) => {
                tracing::warn!(
                    plugin = %linked.plugin_slug,
                    error = %e,
                    "Failed to fetch CHANGELOG.md"
                );
            }
        }
    }

    // Re-index in Meilisearch (description may have changed)
    reindex_plugin(state, linked.plugin_id).await;

    Ok(())
}

// ── Utility Functions ───────────────────────────────────────────────────────

/// Strips a leading `v` or `V` from a version tag (e.g. `v1.2.3` → `1.2.3`).
fn normalize_version_tag(tag: &str) -> String {
    tag.strip_prefix('v')
        .or_else(|| tag.strip_prefix('V'))
        .unwrap_or(tag)
        .to_string()
}

/// Parses `owner/name` from a full repository name.
fn parse_full_name(full_name: &str) -> Option<(&str, &str)> {
    full_name.split_once('/')
}

/// Checks whether a push event targets the default branch.
fn is_default_branch_push(payload: &WebhookPayload, default_branch: &str) -> bool {
    payload
        .git_ref
        .as_deref()
        .map(|r| r == format!("refs/heads/{default_branch}"))
        .unwrap_or(false)
}

/// Detects the target platform from a binary file name.
fn detect_platform_from_filename(filename: &str) -> Option<String> {
    let lower = filename.to_lowercase();
    if lower.contains("windows") || lower.ends_with(".dll") || lower.ends_with(".exe") {
        Some("windows".to_string())
    } else if lower.contains("macos") || lower.contains("darwin") || lower.ends_with(".dylib") {
        Some("macos".to_string())
    } else if lower.contains("linux") || lower.ends_with(".so") {
        Some("linux".to_string())
    } else {
        None
    }
}

/// Computes the SHA-256 hash of binary data, returned as a hex string.
fn compute_sha256(data: &[u8]) -> String {
    let mut hasher = Sha256::new();
    hasher.update(data);
    let result = hasher.finalize();
    result.iter().map(|b| format!("{b:02x}")).collect()
}

/// Fire-and-forget re-index of a plugin in Meilisearch.
async fn reindex_plugin(state: &AppState, plugin_id: Uuid) {
    let search = state.search.clone();
    let db = state.db.clone();
    tokio::spawn(async move {
        if let Ok(Some(doc)) =
            crate::search::indexer::build_single_plugin_document(&db, plugin_id).await
        {
            if let Err(e) = search.index_plugin(&doc).await {
                tracing::warn!("Failed to re-index plugin in Meilisearch: {e}");
            }
        }
    });
}

/// Sends a notification to the plugin author about a new auto-published version.
async fn notify_version_published(pool: &PgPool, linked: &LinkedPlugin, version: &str) {
    let author_id: Option<Uuid> = sqlx::query_scalar("SELECT author_id FROM plugins WHERE id = $1")
        .bind(linked.plugin_id)
        .fetch_optional(pool)
        .await
        .ok()
        .flatten();

    if let Some(user_id) = author_id {
        let _ = sqlx::query(
            "INSERT INTO notifications (id, user_id, kind, title, body, link)
             VALUES (gen_random_uuid(), $1, $2, $3, $4, $5)",
        )
        .bind(user_id)
        .bind("github_publish")
        .bind(format!("Version {} published", version))
        .bind(format!(
            "Version {} of {} was automatically published from GitHub.",
            version, linked.plugin_slug
        ))
        .bind(format!("/plugins/{}", linked.plugin_slug))
        .execute(pool)
        .await;
    }
}

/// Sends a notification about an invalid tag that couldn't be auto-published.
async fn notify_invalid_tag(pool: &PgPool, linked: &LinkedPlugin, tag: &str) {
    let author_id: Option<Uuid> = sqlx::query_scalar("SELECT author_id FROM plugins WHERE id = $1")
        .bind(linked.plugin_id)
        .fetch_optional(pool)
        .await
        .ok()
        .flatten();

    if let Some(user_id) = author_id {
        let _ = sqlx::query(
            "INSERT INTO notifications (id, user_id, kind, title, body, link)
             VALUES (gen_random_uuid(), $1, $2, $3, $4, $5)",
        )
        .bind(user_id)
        .bind("github_publish_error")
        .bind(format!("Invalid tag: {}", tag))
        .bind(format!(
            "Tag '{}' on {} is not valid semver. Please use format vX.Y.Z (e.g. v1.0.0).",
            tag, linked.plugin_slug
        ))
        .bind(format!("/plugins/{}", linked.plugin_slug))
        .execute(pool)
        .await;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_normalize_version_tag() {
        assert_eq!(normalize_version_tag("v1.2.3"), "1.2.3");
        assert_eq!(normalize_version_tag("V1.0.0"), "1.0.0");
        assert_eq!(normalize_version_tag("1.2.3"), "1.2.3");
        assert_eq!(normalize_version_tag("v0.1.0-beta"), "0.1.0-beta");
    }

    #[test]
    fn test_parse_full_name() {
        assert_eq!(parse_full_name("owner/repo"), Some(("owner", "repo")));
        assert_eq!(parse_full_name("invalid"), None);
    }

    #[test]
    fn test_detect_platform_from_filename() {
        assert_eq!(
            detect_platform_from_filename("plugin-windows-x86_64.dll"),
            Some("windows".to_string())
        );
        assert_eq!(
            detect_platform_from_filename("plugin-linux-x86_64.so"),
            Some("linux".to_string())
        );
        assert_eq!(
            detect_platform_from_filename("plugin-macos-aarch64.dylib"),
            Some("macos".to_string())
        );
        assert_eq!(
            detect_platform_from_filename("plugin-darwin-arm64.dylib"),
            Some("macos".to_string())
        );
        assert_eq!(detect_platform_from_filename("README.md"), None);
    }
}
