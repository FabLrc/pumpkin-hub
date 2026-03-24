use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

/// Represents a plugin in the registry.
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Plugin {
    pub id: Uuid,
    pub author_id: Uuid,
    pub name: String,
    pub slug: String,
    pub short_description: Option<String>,
    pub description: Option<String>,
    pub repository_url: Option<String>,
    pub documentation_url: Option<String>,
    pub license: Option<String>,
    pub icon_url: Option<String>,
    pub icon_storage_key: Option<String>,
    pub downloads_total: i64,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}
