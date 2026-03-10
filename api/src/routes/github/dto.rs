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
