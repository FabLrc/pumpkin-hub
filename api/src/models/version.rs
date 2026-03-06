use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

/// Represents a specific release of a plugin with semver and Pumpkin compatibility.
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Version {
    pub id: Uuid,
    pub plugin_id: Uuid,
    pub version: String,
    pub changelog: Option<String>,
    pub pumpkin_version_min: Option<String>,
    pub pumpkin_version_max: Option<String>,
    pub downloads: i64,
    pub is_yanked: bool,
    pub published_at: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
}
