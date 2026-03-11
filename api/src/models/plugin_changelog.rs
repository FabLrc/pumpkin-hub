use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

/// A plugin's changelog — one per plugin, either synced from GitHub or manually edited.
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct PluginChangelog {
    pub id: Uuid,
    pub plugin_id: Uuid,
    pub content: String,
    pub source: String,
    pub updated_by: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}
