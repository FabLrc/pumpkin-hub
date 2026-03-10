use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

/// Represents a GitHub App installation linking a repository to a plugin.
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct GitHubInstallation {
    pub id: Uuid,
    pub plugin_id: Uuid,
    pub user_id: Uuid,
    pub installation_id: i64,
    pub repository_owner: String,
    pub repository_name: String,
    pub default_branch: String,
    pub sync_readme: bool,
    pub sync_changelog: bool,
    pub auto_publish: bool,
    pub last_webhook_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}
