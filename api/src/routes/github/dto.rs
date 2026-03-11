use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

// ── Request DTOs ────────────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct LinkGitHubRequest {
    pub installation_id: i64,
    pub repository_owner: String,
    pub repository_name: String,
    /// Whether to auto-sync README from the repo (default: true).
    pub sync_readme: Option<bool>,
    /// Whether to auto-sync CHANGELOG from the repo (default: true).
    pub sync_changelog: Option<bool>,
    /// Whether to auto-publish on GitHub release (default: true).
    pub auto_publish: Option<bool>,
}

/// Request to create a new Pumpkin Hub plugin directly from a GitHub repository.
/// The plugin name, description, and repository URL are auto-populated from GitHub.
#[derive(Debug, Deserialize)]
pub struct PublishFromGithubRequest {
    pub installation_id: i64,
    pub repository_owner: String,
    pub repository_name: String,
    /// Override the plugin name (defaults to the GitHub repo name).
    pub plugin_name: Option<String>,
    /// Override the short description (defaults to the GitHub repo description).
    pub short_description: Option<String>,
    /// Category IDs to assign to the created plugin.
    pub category_ids: Option<Vec<Uuid>>,
    /// Whether to auto-sync README (default: true).
    pub sync_readme: Option<bool>,
    /// Whether to auto-sync CHANGELOG (default: true).
    pub sync_changelog: Option<bool>,
    /// Whether to auto-publish on GitHub release (default: true).
    pub auto_publish: Option<bool>,
}

impl PublishFromGithubRequest {
    pub fn validate(&self) -> Result<(), crate::error::AppError> {
        if self.installation_id <= 0 {
            return Err(crate::error::AppError::UnprocessableEntity(
                "installation_id must be a positive integer".to_string(),
            ));
        }
        if self.repository_owner.is_empty() {
            return Err(crate::error::AppError::UnprocessableEntity(
                "repository_owner is required".to_string(),
            ));
        }
        if self.repository_name.is_empty() {
            return Err(crate::error::AppError::UnprocessableEntity(
                "repository_name is required".to_string(),
            ));
        }
        Ok(())
    }
}

impl LinkGitHubRequest {
    pub fn validate(&self) -> Result<(), crate::error::AppError> {
        if self.repository_owner.is_empty() {
            return Err(crate::error::AppError::UnprocessableEntity(
                "repository_owner is required".to_string(),
            ));
        }
        if self.repository_name.is_empty() {
            return Err(crate::error::AppError::UnprocessableEntity(
                "repository_name is required".to_string(),
            ));
        }
        if self.installation_id <= 0 {
            return Err(crate::error::AppError::UnprocessableEntity(
                "installation_id must be a positive integer".to_string(),
            ));
        }
        Ok(())
    }
}

// ── Response DTOs ───────────────────────────────────────────────────────────

#[derive(Debug, Serialize)]
pub struct GitHubLinkResponse {
    pub id: Uuid,
    pub plugin_id: Uuid,
    pub installation_id: i64,
    pub repository_owner: String,
    pub repository_name: String,
    pub repository_full_name: String,
    pub default_branch: String,
    pub sync_readme: bool,
    pub sync_changelog: bool,
    pub auto_publish: bool,
    pub last_webhook_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize)]
#[allow(dead_code)]
pub struct BadgeMarkdownResponse {
    pub markdown: String,
    pub url: String,
}

/// Serializable summary of a GitHub repository (used in the repo picker).
#[derive(Debug, Serialize)]
pub struct GitHubRepositoryDto {
    pub full_name: String,
    pub owner: String,
    pub name: String,
    pub default_branch: String,
    pub description: Option<String>,
}

/// Response from the list-installation-repositories endpoint.
#[derive(Debug, Serialize)]
pub struct InstallationRepositoriesResponse {
    pub installation_id: i64,
    pub repositories: Vec<GitHubRepositoryDto>,
}

/// Response from the publish-from-github endpoint.
/// Includes the newly created plugin slug so the client can redirect.
#[derive(Debug, Serialize)]
pub struct PublishFromGithubResponse {
    pub plugin_slug: String,
    pub github_link: GitHubLinkResponse,
}

/// A single repository in the "my repositories" response.
/// Includes the `installation_id` so the frontend can pass it back transparently.
#[derive(Debug, Serialize)]
pub struct MyGithubRepositoryDto {
    pub installation_id: i64,
    pub full_name: String,
    pub owner: String,
    pub name: String,
    pub default_branch: String,
    pub description: Option<String>,
}

/// Response from `GET /github/my-repositories`.
#[derive(Debug, Serialize)]
pub struct MyRepositoriesResponse {
    pub repositories: Vec<MyGithubRepositoryDto>,
}
