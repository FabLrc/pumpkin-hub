use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

/// A declared dependency between a plugin version and another plugin.
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct PluginDependency {
    pub id: Uuid,
    pub version_id: Uuid,
    pub dependency_plugin_id: Uuid,
    pub version_req: String,
    pub is_optional: bool,
    pub created_at: DateTime<Utc>,
}
